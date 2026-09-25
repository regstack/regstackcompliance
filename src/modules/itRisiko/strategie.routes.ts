import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("itGovernanceRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const strategien = await prisma.itStrategie.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { jahr: "desc" },
    });
    res.json(strategien);
  })
);

const createSchema = z.object({
  jahr: z.number().int(),
  inhalt: z.record(z.any()).default({}),
  konsistenzpruefungGeschaeftsstrategie: z.string().nullable().optional(),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { naechsteUeberpruefung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItStrategie", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itStrategie.create({
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
  konsistenzpruefungGeschaeftsstrategie: z.string().nullable().optional(),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

router.put(
  "/:id",
  requirePermission("itGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itStrategie.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Strategie nicht gefunden");
    if (before.status === "verabschiedet") throw new ValidationError("Verabschiedete IT-Strategien können nicht mehr bearbeitet werden.");

    const { naechsteUeberpruefung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItStrategie", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itStrategie.update({
          where: { id: before.id },
          data: { ...rest, naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung) : undefined },
        })
    );
    res.json(updated);
  })
);

// Verabschiedung durch die Geschäftsleitung — BAIT Kap. 1, serverseitig über
// "itStrategy.approve" erzwungen.
router.post(
  "/:id/verabschieden",
  requirePermission("itStrategy.approve", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itStrategie.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Strategie nicht gefunden");
    if (before.status === "verabschiedet") throw new ForbiddenError("IT-Strategie bereits verabschiedet");

    const updated = await withAudit(
      { entityType: "ItStrategie", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itStrategie.update({
          where: { id: before.id },
          data: { status: "verabschiedet", verabschiedetAm: new Date(), verabschiedetVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
