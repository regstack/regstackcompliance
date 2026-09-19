import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("riskManagementRecord", "read"),
  asyncHandler(async (req, res) => {
    const snapshots = await prisma.risikotragfaehigkeit.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { createdAt: "desc" },
    });
    res.json(snapshots);
  })
);

const createSchema = z.object({
  periode: z.string().min(1),
  ansatz: z.enum(["normativ", "oekonomisch"]),
  risikodeckungspotenzial: z.number().nullable().optional(),
  limits: z.record(z.any()).default({}),
  auslastungGesamt: z.number().nullable().optional(),
  ergebnis: z.string().nullable().optional(),
  methodenpruefungAm: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { methodenpruefungAm, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "Risikotragfaehigkeit", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.risikotragfaehigkeit.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            methodenpruefungAm: methodenpruefungAm ? new Date(methodenpruefungAm) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

// Freigabe der RTF-Berechnung — bleibt innerhalb der riskManagementRecord-Schreibrechte
// (Risikocontrolling-Funktion, AT 4.4.1), anders als die Strategie-Verabschiedung, die an
// die Geschäftsleitung gebunden ist.
router.post(
  "/:id/freigeben",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.risikotragfaehigkeit.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Risikotragfähigkeits-Snapshot nicht gefunden");
    if (before.freigegebenAm) throw new ValidationError("Snapshot bereits freigegeben");

    const updated = await withAudit(
      { entityType: "Risikotragfaehigkeit", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.risikotragfaehigkeit.update({
          where: { id: before.id },
          data: { freigegebenVonUserId: req.user!.userId, freigegebenAm: new Date() },
        })
    );
    res.json(updated);
  })
);

export default router;
