import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { acknowledgeAccountingDocument, listSignOffs } from "./signoff";
import { listAccountingFiles } from "./fileAttachment";
import { createDocumentFileRoutes } from "./documentFileRoutes";

const router = Router();
router.use(
  "/:id",
  createDocumentFileRoutes("ANHANG", (id, institutionId) => prisma.accountingNotes.findFirst({ where: { id, institutionId } }))
);

const sectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
  linkedLineItemLabel: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const notesSchema = z.object({
  fiscalYear: z.number().int(),
  sections: z.array(sectionSchema).default([]),
});

router.get(
  "/",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const fiscalYear = typeof req.query.fiscalYear === "string" ? Number(req.query.fiscalYear) : undefined;
    const notes = await prisma.accountingNotes.findMany({
      where: { institutionId: req.user!.institutionId, fiscalYear },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
      orderBy: { fiscalYear: "desc" },
    });
    const [signOffs, files] = await Promise.all([
      listSignOffs("ANHANG", notes.map((n) => n.id)),
      listAccountingFiles("ANHANG", notes.map((n) => n.id)),
    ]);
    res.json(
      notes.map((n) => ({
        ...n,
        signOffs: signOffs.filter((a) => a.documentId === n.id),
        file: files.find((f) => f.documentId === n.id) ?? null,
      }))
    );
  })
);

router.get(
  "/:id",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const notes = await prisma.accountingNotes.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
    if (!notes) throw new NotFoundError("Anhang nicht gefunden");
    const [signOffs, files] = await Promise.all([listSignOffs("ANHANG", [notes.id]), listAccountingFiles("ANHANG", [notes.id])]);
    res.json({ ...notes, signOffs, file: files[0] ?? null });
  })
);

router.post(
  "/",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = notesSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "AccountingNotes", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.accountingNotes.create({
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
    const parsed = notesSchema.partial({ fiscalYear: true }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.accountingNotes.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { sections: true },
    });
    if (!before) throw new NotFoundError("Anhang nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können bearbeitet werden.");

    const updated = await withAudit(
      { entityType: "AccountingNotes", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        if (parsed.data.sections) {
          await tx.accountingNotesSection.deleteMany({ where: { notesId: before.id } });
        }
        return tx.accountingNotes.update({
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
    const before = await prisma.accountingNotes.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Anhang nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "AccountingNotes", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.accountingNotes.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/acknowledge",
  requirePermission("accountingReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.accountingNotes.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!doc) throw new NotFoundError("Anhang nicht gefunden");
    const ack = await acknowledgeAccountingDocument("ANHANG", doc, req.user!, req.ip);
    res.status(201).json(ack);
  })
);

export default router;
