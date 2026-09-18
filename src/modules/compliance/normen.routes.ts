import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";
import { canRespondToHandshake } from "./handshake";

const router = Router();

router.get(
  "/",
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const normen = await prisma.norm.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(normen);
  })
);

const normSchema = z.object({
  bezeichnung: z.string().min(1),
  quelle: z.string().optional(),
  sachgebiet: z.string().optional(),
  relevanz: z.enum(["relevant", "nicht_relevant"]),
  relevanzBegruendung: z.string().optional(),
  wesentlichkeit: z.string().optional(),
  wesentlichkeitBegruendung: z.string().optional(),
  risiko: z.string().optional(),
});

router.post(
  "/",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = normSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Norm", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.norm.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data } })
    );
    res.status(201).json(created);
  })
);

// Every handshake institution-wide, any status — powers the register/export pages that need a
// cross-norm view (the export CSV, the dashboard stats) rather than one norm's latest. Registered
// before "/:id" so "handshakes" is never mistaken for a norm id.
router.get(
  "/handshakes",
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const handshakes = await prisma.normAssignmentHandshake.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { proposedAt: "desc" },
    });
    res.json(handshakes);
  })
);

// Cross-norm listing for the dashboard's Geschäftsleitung view — every handshake awaiting a
// decision, institution-wide.
router.get(
  "/handshakes/disputed",
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const disputed = await prisma.normAssignmentHandshake.findMany({
      where: { institutionId: req.user!.institutionId, status: "widersprochen" },
      include: { norm: { select: { bezeichnung: true } } },
      orderBy: { disputedAt: "asc" },
    });
    res.json(disputed);
  })
);

router.get(
  "/:id",
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const norm = await prisma.norm.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!norm) throw new NotFoundError("Regelung nicht gefunden");
    res.json(norm);
  })
);

router.patch(
  "/:id",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = normSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.norm.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Regelung nicht gefunden");

    const updated = await withAudit(
      { entityType: "Norm", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.norm.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * Normzuweisung-Handshake — zweistufige Bestätigung (Compliance vorschlagen,
 * Fachbereich bestätigen/bestreiten, Geschäftsleitung entscheidet im Streitfall).
 * "Fachbereich" ist hier keine Rolle, sondern Eigentümerschaft: wer als assignedUserId
 * vorgeschlagen wurde, darf antworten — unabhängig von seiner Backend-Role.
 * ===================================================================*/

router.get(
  "/:normId/handshake",
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const norm = await prisma.norm.findFirst({ where: { id: req.params.normId, institutionId: req.user!.institutionId } });
    if (!norm) throw new NotFoundError("Regelung nicht gefunden");

    const handshake = await prisma.normAssignmentHandshake.findFirst({
      where: { normId: norm.id },
      orderBy: { proposedAt: "desc" },
    });
    res.json(handshake);
  })
);

const proposeSchema = z.object({ assignedUserId: z.string().min(1) });

router.post(
  "/:normId/handshake",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = proposeSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const norm = await prisma.norm.findFirst({ where: { id: req.params.normId, institutionId: req.user!.institutionId } });
    if (!norm) throw new NotFoundError("Regelung nicht gefunden");

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "NormAssignmentHandshake", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.normAssignmentHandshake.create({
          data: {
            id,
            institutionId: norm.institutionId,
            normId: norm.id,
            assignedUserId: parsed.data.assignedUserId,
            proposedByUserId: req.user!.userId,
          },
        })
    );
    res.status(201).json(created);
  })
);

const respondSchema = z.object({
  response: z.enum(["bestaetigt", "widersprochen"]),
  disputeReason: z.string().optional(),
});

router.post(
  "/:normId/handshake/:handshakeId/respond",
  asyncHandler(async (req, res) => {
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const handshake = await prisma.normAssignmentHandshake.findFirst({
      where: { id: req.params.handshakeId, normId: req.params.normId, institutionId: req.user!.institutionId },
    });
    if (!handshake) throw new NotFoundError("Zuweisung nicht gefunden");
    if (!canRespondToHandshake(handshake, req.user!.userId)) {
      throw handshake.status !== "vorschlag"
        ? new ValidationError("Zuweisung ist bereits beantwortet.")
        : new ForbiddenError("Nur die vorgeschlagene Person kann diese Zuweisung beantworten.");
    }

    const data =
      parsed.data.response === "bestaetigt"
        ? { status: "bestaetigt" as const, confirmedAt: new Date() }
        : { status: "widersprochen" as const, disputeReason: parsed.data.disputeReason, disputedAt: new Date() };

    const updated = await withAudit(
      { entityType: "NormAssignmentHandshake", entityId: handshake.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: handshake },
      (tx) => tx.normAssignmentHandshake.update({ where: { id: handshake.id }, data })
    );

    // Mirrors the Supabase trigger: confirming an assignment sets the norm's fachbereichUserId.
    if (parsed.data.response === "bestaetigt") {
      await prisma.norm.update({ where: { id: req.params.normId }, data: { fachbereichUserId: handshake.assignedUserId } });
    }

    res.json(updated);
  })
);

const decideSchema = z.object({ decisionNote: z.string().min(1) });

router.post(
  "/:normId/handshake/:handshakeId/decide",
  requirePermission("complianceHandshake.decide", "write"),
  asyncHandler(async (req, res) => {
    const parsed = decideSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const handshake = await prisma.normAssignmentHandshake.findFirst({
      where: { id: req.params.handshakeId, institutionId: req.user!.institutionId },
    });
    if (!handshake) throw new NotFoundError("Zuweisung nicht gefunden");
    if (handshake.status !== "widersprochen") throw new ValidationError("Nur widersprochene Zuweisungen können entschieden werden.");

    const updated = await withAudit(
      { entityType: "NormAssignmentHandshake", entityId: handshake.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: handshake },
      (tx) =>
        tx.normAssignmentHandshake.update({
          where: { id: handshake.id },
          data: { status: "entschieden", decisionByUserId: req.user!.userId, decisionAt: new Date(), decisionNote: parsed.data.decisionNote },
        })
    );
    res.json(updated);
  })
);

export default router;
