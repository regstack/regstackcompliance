import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("monitoring", "read"),
  asyncHandler(async (req, res) => {
    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");
    const records = await prisma.monitoringRecord.findMany({
      where: { activityId: activity.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(records);
  })
);

const evidenceSchema = z.object({
  type: z.literal("EVIDENCE_LOG"),
  evidenceDate: z.string().datetime(),
  evidenceDescription: z.string().min(1),
  reviewedByUserId: z.string().optional(),
  escalationNeeded: z.boolean().optional(),
  escalationNote: z.string().optional(),
  assuranceReportDueDate: z.string().datetime().optional(),
});
const kpiSchema = z.object({
  type: z.literal("KPI"),
  kpiName: z.string().min(1),
  kpiTarget: z.string().optional(),
  kpiAchieved: z.string().optional(),
  kpiComment: z.string().optional(),
});
const schema = z.union([evidenceSchema, kpiSchema]);

// Tz. 9 — Evidenz-Log ist die Pflichtbasis für ALLE Auslagerungen (unabhängig von Wesentlichkeit);
// der KPI-Tracker bleibt bewusst optional (siehe Tesla_FS_Befunde_und_MVP_Architektur.md, Punkt 1).
router.post(
  "/",
  requirePermission("monitoring", "write"),
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    const data =
      parsed.data.type === "EVIDENCE_LOG"
        ? {
            activityId: activity.id,
            type: "EVIDENCE_LOG" as const,
            evidenceDate: new Date(parsed.data.evidenceDate),
            evidenceDescription: parsed.data.evidenceDescription,
            reviewedByUserId: parsed.data.reviewedByUserId,
            reviewedAt: parsed.data.reviewedByUserId ? new Date() : undefined,
            escalationNeeded: parsed.data.escalationNeeded ?? false,
            escalationNote: parsed.data.escalationNote,
            assuranceReportDueDate: parsed.data.assuranceReportDueDate
              ? new Date(parsed.data.assuranceReportDueDate)
              : undefined,
          }
        : {
            activityId: activity.id,
            type: "KPI" as const,
            kpiName: parsed.data.kpiName,
            kpiTarget: parsed.data.kpiTarget,
            kpiAchieved: parsed.data.kpiAchieved,
            kpiComment: parsed.data.kpiComment,
          };

    const created = await withAudit(
      { entityType: "MonitoringRecord", entityId: activity.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.monitoringRecord.create({ data })
    );
    res.status(201).json(created);
  })
);

export default router;
