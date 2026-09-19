import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { acknowledgeAccountingDocument, listSignOffs } from "./signoff";

const router = Router();

const sectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
  sortOrder: z.number().int().optional(),
});

const reportSchema = z.object({
  fiscalYear: z.number().int(),
  sections: z.array(sectionSchema).default([]),
});

router.get(
  "/",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const fiscalYear = typeof req.query.fiscalYear === "string" ? Number(req.query.fiscalYear) : undefined;
    const reports = await prisma.managementReport.findMany({
      where: { institutionId: req.user!.institutionId, fiscalYear },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
      orderBy: { fiscalYear: "desc" },
    });
    const signOffs = await listSignOffs("LAGEBERICHT", reports.map((r) => r.id));
    res.json(reports.map((r) => ({ ...r, signOffs: signOffs.filter((a) => a.documentId === r.id) })));
  })
);

router.get(
  "/:id",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const report = await prisma.managementReport.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
    if (!report) throw new NotFoundError("Lagebericht nicht gefunden");
    const signOffs = await listSignOffs("LAGEBERICHT", [report.id]);
    res.json({ ...report, signOffs });
  })
);

router.post(
  "/",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ManagementReport", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.managementReport.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            fiscalYear: parsed.data.fiscalYear,
            sections: { create: parsed.data.sections },
          },
          include: { sections: true },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.partial({ fiscalYear: true }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.managementReport.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { sections: true },
    });
    if (!before) throw new NotFoundError("Lagebericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können bearbeitet werden.");

    const updated = await withAudit(
      { entityType: "ManagementReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        if (parsed.data.sections) {
          await tx.managementReportSection.deleteMany({ where: { reportId: before.id } });
        }
        return tx.managementReport.update({
          where: { id: before.id },
          data: { sections: parsed.data.sections ? { create: parsed.data.sections } : undefined },
          include: { sections: true },
        });
      }
    );
    res.json(updated);
  })
);

router.post(
  "/:id/finalize",
  requirePermission("accountingReport", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.managementReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Lagebericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "ManagementReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.managementReport.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/acknowledge",
  requirePermission("accountingReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.managementReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!doc) throw new NotFoundError("Lagebericht nicht gefunden");
    const ack = await acknowledgeAccountingDocument("LAGEBERICHT", doc, req.user!, req.ip);
    res.status(201).json(ack);
  })
);

export default router;
