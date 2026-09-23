import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const STATUS = ["geplant", "laufend", "abgeschlossen", "abgebrochen"] as const;

router.get(
  "/",
  requirePermission("itProjectRecord", "read"),
  asyncHandler(async (req, res) => {
    const projekte = await prisma.itProjekt.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { createdAt: "desc" },
    });
    res.json(projekte);
  })
);

const createSchema = z.object({
  bezeichnung: z.string().min(1),
  ziel: z.string().nullable().optional(),
  vorgehensmodell: z.string().nullable().optional(),
  risikobewertung: z.string().nullable().optional(),
  ressourcenausstattung: z.string().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  startAm: z.string().datetime().nullable().optional(),
  geplantesEndeAm: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itProjectRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { startAm, geplantesEndeAm, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItProjekt", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itProjekt.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            startAm: startAm ? new Date(startAm) : undefined,
            geplantesEndeAm: geplantesEndeAm ? new Date(geplantesEndeAm) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = createSchema.partial().extend({ status: z.enum(STATUS).optional() });

router.put(
  "/:id",
  requirePermission("itProjectRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itProjekt.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Projekt nicht gefunden");
    if (before.status === "abgeschlossen" || before.status === "abgebrochen") {
      throw new ValidationError("Ein abgeschlossenes oder abgebrochenes Projekt kann nicht mehr bearbeitet werden.");
    }

    const { startAm, geplantesEndeAm, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItProjekt", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itProjekt.update({
          where: { id: before.id },
          data: {
            ...rest,
            startAm: startAm ? new Date(startAm) : undefined,
            geplantesEndeAm: geplantesEndeAm ? new Date(geplantesEndeAm) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

// Tz. 7.2 — Aufarbeitung der gewonnenen Erkenntnisse (Lessons Learned) gehört zum
// Projektabschlussbericht dazu, deshalb hier Pflichtfeld statt optional nachgereicht.
const abschliessenSchema = z.object({ lessonsLearned: z.string().min(1) });

router.post(
  "/:id/abschliessen",
  requirePermission("itProjectRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = abschliessenSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itProjekt.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Projekt nicht gefunden");
    if (before.status === "abgeschlossen" || before.status === "abgebrochen") {
      throw new ValidationError("Projekt ist bereits beendet.");
    }

    const updated = await withAudit(
      { entityType: "ItProjekt", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itProjekt.update({
          where: { id: before.id },
          data: { status: "abgeschlossen", tatsaechlichesEndeAm: new Date(), lessonsLearned: parsed.data.lessonsLearned },
        })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/abbrechen",
  requirePermission("itProjectRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itProjekt.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Projekt nicht gefunden");
    if (before.status === "abgeschlossen" || before.status === "abgebrochen") {
      throw new ValidationError("Projekt ist bereits beendet.");
    }

    const updated = await withAudit(
      { entityType: "ItProjekt", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itProjekt.update({
          where: { id: before.id },
          data: { status: "abgebrochen", tatsaechlichesEndeAm: new Date() },
        })
    );
    res.json(updated);
  })
);

export default router;
