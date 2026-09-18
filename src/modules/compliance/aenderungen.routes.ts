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
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const aenderungen = await prisma.regulatorischeAenderung.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { quelle: { select: { bezeichnung: true } } },
      orderBy: { erfasstAm: "desc" },
    });
    res.json(aenderungen);
  })
);

const aenderungSchema = z.object({
  quelleId: z.string().nullable().optional(),
  erfasstAm: z.string().datetime(),
  gegenstand: z.string().min(1),
  kritikalitaet: z.string().optional(),
  inkrafttreten: z.string().optional(),
  zugewiesenAnUserId: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = aenderungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RegulatorischeAenderung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.regulatorischeAenderung.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            ...parsed.data,
            erfasstAm: new Date(parsed.data.erfasstAm),
          },
        })
    );
    res.status(201).json(created);
  })
);

const dispositionSchema = z.object({ disposition: z.enum(["offen", "geprueft", "kenntnis", "angewandt", "projekt"]) });

router.patch(
  "/:id/disposition",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = dispositionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.regulatorischeAenderung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Änderung nicht gefunden");

    const updated = await withAudit(
      { entityType: "RegulatorischeAenderung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.regulatorischeAenderung.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

export default router;
