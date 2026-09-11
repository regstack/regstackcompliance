import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/me",
  requirePermission("institution", "read"),
  asyncHandler(async (req, res) => {
    const inst = await prisma.institutionProfile.findUnique({ where: { id: req.user!.institutionId } });
    if (!inst) throw new NotFoundError("Institut nicht gefunden");
    res.json(inst);
  })
);

const updateSchema = z.object({
  sizeClass: z.enum(["SEHR_KLEIN", "KLEIN", "MITTEL", "GROSS"]).optional(),
  groupRelief: z.boolean().optional(),
  calculationModel: z.enum(["CSC", "TESLA"]).optional(),
  cscMaterialityThreshold: z.number().min(1).max(5).optional(),
  cscImpactThreshold: z.number().min(1).max(5).optional(),
  teslaLogicAnd: z.boolean().optional(),
  teslaThreshold: z.number().min(1).max(5).optional(),
  revisionsbeauftragterName: z.string().nullable().optional(),
  revisionsbeauftragterIstGeschaeftsleiter: z.boolean().optional(),
});

// Governance settings (calculation model, group relief, Revisionsbeauftragter) — Geschäftsleitung/
// Admin only (rbac.ts), and every change is audited so a later dispute over "which model applied
// when" is answerable from audit_log_events, not from memory.
router.patch(
  "/me",
  requirePermission("institution", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.institutionProfile.findUnique({ where: { id: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Institut nicht gefunden");

    const updated = await withAudit(
      { entityType: "InstitutionProfile", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.institutionProfile.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

export default router;
