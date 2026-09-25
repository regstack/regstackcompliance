import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("complianceRecord", "read"),
  requireAccessGrant("COMPLIANCE"),
  asyncHandler(async (req, res) => {
    const ratings = await prisma.complianceRating.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { erfasstAm: "asc" },
    });
    res.json(ratings);
  })
);

const ratingSchema = z.object({ periode: z.string().min(1), rating: z.string().min(1), begruendung: z.string().nullable().optional() });

router.post(
  "/",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = ratingSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ComplianceRating", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.complianceRating.create({
          data: { id, institutionId: req.user!.institutionId, erfasstVonUserId: req.user!.userId, erfasstAm: new Date(), ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

export default router;
