import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const PRIORITAET = ["niedrig", "mittel", "hoch", "kritisch"] as const;

router.get(
  "/",
  requirePermission("itOperationsRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const stoerungen = await prisma.itBetriebsstoerung.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { datum: "desc" },
    });
    res.json(stoerungen);
  })
);

const createSchema = z.object({
  datum: z.string().datetime(),
  beschreibung: z.string().min(1),
  betroffeneSysteme: z.string().nullable().optional(),
  ursache: z.string().nullable().optional(),
  prioritaet: z.enum(PRIORITAET).default("mittel"),
  eskalationAnUserId: z.string().nullable().optional(),
  geschaeftsleitungInformiert: z.boolean().default(false),
});

router.post(
  "/",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { datum, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItBetriebsstoerung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itBetriebsstoerung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, datum: new Date(datum), ...rest },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  beschreibung: z.string().min(1).optional(),
  betroffeneSysteme: z.string().nullable().optional(),
  ursache: z.string().nullable().optional(),
  prioritaet: z.enum(PRIORITAET).optional(),
  eskalationAnUserId: z.string().nullable().optional(),
  geschaeftsleitungInformiert: z.boolean().optional(),
  massnahme: z.string().nullable().optional(),
});

router.put(
  "/:id",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itBetriebsstoerung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Betriebsstörung nicht gefunden");

    const updated = await withAudit(
      { entityType: "ItBetriebsstoerung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.itBetriebsstoerung.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/abschliessen",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itBetriebsstoerung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Betriebsstörung nicht gefunden");
    if (before.status === "geschlossen") throw new ValidationError("Störung bereits abgeschlossen");

    const updated = await withAudit(
      { entityType: "ItBetriebsstoerung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itBetriebsstoerung.update({
          where: { id: before.id },
          data: { status: "geschlossen", abschlussAm: new Date(), abschlussVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
