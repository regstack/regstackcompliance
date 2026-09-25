import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("complianceGovernance", "read"),
  requireAccessGrant("COMPLIANCE"),
  asyncHandler(async (req, res) => {
    const settings = await prisma.complianceGovernanceSettings.findUnique({ where: { institutionId: req.user!.institutionId } });
    res.json(settings);
  })
);

const settingsSchema = z.object({
  sonderfallKleinesInstitut: z.boolean(),
  interessenkonfliktMassnahmen: z.string().nullable().optional(),
  kombinationRationale: z.string().nullable().optional(),
  ressourcenausstattung: z.string().nullable().optional(),
});

router.put(
  "/",
  requirePermission("complianceGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.complianceGovernanceSettings.findUnique({ where: { institutionId: req.user!.institutionId } });

    const updated = await withAudit(
      {
        entityType: "ComplianceGovernanceSettings",
        entityId: req.user!.institutionId,
        action: before ? "UPDATE" : "CREATE",
        actor: req.user,
        ipAddress: req.ip,
        before,
      },
      (tx) =>
        tx.complianceGovernanceSettings.upsert({
          where: { institutionId: req.user!.institutionId },
          create: { institutionId: req.user!.institutionId, updatedByUserId: req.user!.userId, ...parsed.data },
          update: { updatedByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.json(updated);
  })
);

export default router;
