import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("complianceReport", "read"),
  requireAccessGrant("COMPLIANCE"),
  asyncHandler(async (req, res) => {
    const reports = await prisma.complianceReport.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { acknowledgements: true },
      orderBy: { periodFrom: "desc" },
    });
    res.json(reports);
  })
);

const reportSchema = z.object({
  reportType: z.string().min(1),
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
  content: z.record(z.any()).default({}),
});

router.post(
  "/",
  requirePermission("complianceReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ComplianceReport", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.complianceReport.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            reportType: parsed.data.reportType,
            content: parsed.data.content,
            periodFrom: parsed.data.periodFrom ? new Date(parsed.data.periodFrom) : undefined,
            periodTo: parsed.data.periodTo ? new Date(parsed.data.periodTo) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.post(
  "/:id/finalize",
  requirePermission("complianceReport", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.complianceReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "ComplianceReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.complianceReport.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

// Records this user's own Kenntnisnahme — replaces the Supabase-era single-value
// kenntnisnahme_by/at plus the app-level content.recipients name-matching workaround with a real
// per-person row (ComplianceReportAcknowledgement), so "who has and hasn't signed off" is an
// actual query instead of free-text bookkeeping.
router.post(
  "/:id/acknowledge",
  requirePermission("complianceReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const report = await prisma.complianceReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!report) throw new NotFoundError("Bericht nicht gefunden");
    if (report.status !== "final") throw new ValidationError("Nur finale Berichte können zur Kenntnis genommen werden.");

    const ack = await withAudit(
      { entityType: "ComplianceReportAcknowledgement", entityId: report.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.complianceReportAcknowledgement.upsert({
          where: { reportId_userId: { reportId: report.id, userId: req.user!.userId } },
          create: { reportId: report.id, userId: req.user!.userId },
          update: {},
        })
    );
    res.status(201).json(ack);
  })
);

export default router;
