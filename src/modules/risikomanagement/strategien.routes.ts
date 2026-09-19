import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("riskStrategy", "read"),
  asyncHandler(async (req, res) => {
    const strategien = await prisma.risikostrategie.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: [{ jahr: "desc" }, { art: "asc" }],
    });
    res.json(strategien);
  })
);

const createSchema = z.object({
  art: z.enum(["geschaeftsstrategie", "risikostrategie", "teilstrategie"]),
  jahr: z.number().int(),
  inhalt: z.record(z.any()).default({}),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

// Neue Strategien starten immer als Entwurf — die Verabschiedung ist ein eigener,
// Geschäftsleitung-exklusiver Schritt (siehe /:id/verabschieden), niemals ein Client-Feld hier.
router.post(
  "/",
  requirePermission("riskStrategy", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { naechsteUeberpruefung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "Risikostrategie", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.risikostrategie.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  inhalt: z.record(z.any()).optional(),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

router.put(
  "/:id",
  requirePermission("riskStrategy", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.risikostrategie.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Strategie nicht gefunden");
    if (before.status === "verabschiedet") throw new ValidationError("Verabschiedete Strategien können nicht mehr bearbeitet werden.");

    const { naechsteUeberpruefung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "Risikostrategie", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.risikostrategie.update({
          where: { id: before.id },
          data: { ...rest, naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung) : undefined },
        })
    );
    res.json(updated);
  })
);

// Verabschiedung durch die Geschäftsleitung — AT 4.2, serverseitig durch die
// "riskStrategy.approve"-RBAC-Zeile erzwungen, nicht nur durch ein Frontend-Formular.
router.post(
  "/:id/verabschieden",
  requirePermission("riskStrategy.approve", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.risikostrategie.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Strategie nicht gefunden");
    if (before.status === "verabschiedet") throw new ForbiddenError("Strategie bereits verabschiedet");

    const updated = await withAudit(
      { entityType: "Risikostrategie", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.risikostrategie.update({
          where: { id: before.id },
          data: { status: "verabschiedet", verabschiedetAm: new Date(), verabschiedetVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
