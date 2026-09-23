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
  requirePermission("riskManagementReport", "read"),
  asyncHandler(async (req, res) => {
    const reports = await prisma.rmReport.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { acknowledgements: true },
      orderBy: { periodFrom: "desc" },
    });
    res.json(reports);
  })
);

const EMPFAENGER = ["geschaeftsleitung", "aufsichtsorgan"] as const;

const reportSchema = z.object({
  reportType: z.string().min(1),
  empfaenger: z.enum(EMPFAENGER).default("geschaeftsleitung"),
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
  content: z.record(z.any()).default({}),
});

router.post(
  "/",
  requirePermission("riskManagementReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RmReport", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmReport.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            reportType: parsed.data.reportType,
            empfaenger: parsed.data.empfaenger,
            content: parsed.data.content,
            periodFrom: parsed.data.periodFrom ? new Date(parsed.data.periodFrom) : undefined,
            periodTo: parsed.data.periodTo ? new Date(parsed.data.periodTo) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  reportType: z.string().min(1).optional(),
  empfaenger: z.enum(EMPFAENGER).optional(),
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
});

router.put(
  "/:id",
  requirePermission("riskManagementReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können bearbeitet werden.");

    const { periodFrom, periodTo, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "RmReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmReport.update({
          where: { id: before.id },
          data: {
            ...rest,
            periodFrom: periodFrom ? new Date(periodFrom) : undefined,
            periodTo: periodTo ? new Date(periodTo) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/finalize",
  requirePermission("riskManagementReport", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.rmReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "RmReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.rmReport.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

// Wie bei ComplianceReport: ein echter Zeilen-Datensatz pro Kenntnisnahme statt eines einzelnen
// überschriebenen kenntnisnahmeBy/At-Felds — "wer hat noch nicht bestätigt" ist eine Abfrage.
router.post(
  "/:id/acknowledge",
  requirePermission("riskManagementReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const report = await prisma.rmReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!report) throw new NotFoundError("Bericht nicht gefunden");
    if (report.status !== "final") throw new ValidationError("Nur finale Berichte können zur Kenntnis genommen werden.");

    const ack = await withAudit(
      { entityType: "RmReportAcknowledgement", entityId: report.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmReportAcknowledgement.upsert({
          where: { reportId_userId: { reportId: report.id, userId: req.user!.userId } },
          create: { reportId: report.id, userId: req.user!.userId },
          update: {},
        })
    );
    res.status(201).json(ack);
  })
);

export default router;
