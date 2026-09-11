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
  requirePermission("report", "read"),
  asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { createdDate: "desc" },
    });
    res.json(reports);
  })
);

const createSchema = z.object({
  period: z.string().min(1),
  conclusionContract: z.string().min(1),
  conclusionSteuerbarkeit: z.string().min(1),
  conclusionMassnahmen: z.string().min(1),
  includedActivityIds: z.array(z.string()),
});

// Format (schriftlicher Bericht vs. Vorstandssitzungsprotokoll) is derived from sizeClass, never
// client-supplied — that is the point of the Tz. 13 S. 4 Erleichterung for very small institutions.
router.post(
  "/",
  requirePermission("report", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const institution = await prisma.institutionProfile.findUniqueOrThrow({ where: { id: req.user!.institutionId } });
    const format = institution.sizeClass === "SEHR_KLEIN" ? "VORSTANDSSITZUNGSPROTOKOLL" : "SCHRIFTLICHER_BERICHT";

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Report", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.report.create({
          data: { id, institutionId: institution.id, format, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

router.post(
  "/:id/approve",
  requirePermission("report.approve", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.report.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status === "GENEHMIGT") throw new ForbiddenError("Bericht bereits genehmigt");

    const updated = await withAudit(
      { entityType: "Report", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.report.update({
          where: { id: before.id },
          data: { status: "GENEHMIGT", approvedByUserId: req.user!.userId, approvedAt: new Date() },
        })
    );
    res.json(updated);
  })
);

export default router;
