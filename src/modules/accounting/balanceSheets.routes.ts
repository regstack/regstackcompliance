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

const lineItemSchema = z.object({
  side: z.enum(["AKTIVA", "PASSIVA"]),
  section: z.enum([
    "ANLAGEVERMOEGEN",
    "UMLAUFVERMOEGEN",
    "RECHNUNGSABGRENZUNG_AKTIVA",
    "EIGENKAPITAL",
    "RUECKSTELLUNGEN",
    "VERBINDLICHKEITEN",
    "RECHNUNGSABGRENZUNG_PASSIVA",
  ]),
  label: z.string().min(1),
  currentAmount: z.number(),
  priorYearAmount: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const balanceSheetSchema = z.object({
  fiscalYear: z.number().int(),
  periodLabel: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
});

router.get(
  "/",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const fiscalYear = typeof req.query.fiscalYear === "string" ? Number(req.query.fiscalYear) : undefined;
    const sheets = await prisma.balanceSheet.findMany({
      where: { institutionId: req.user!.institutionId, fiscalYear },
      include: { lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { fiscalYear: "desc" },
    });
    const signOffs = await listSignOffs("BILANZ", sheets.map((s) => s.id));
    res.json(sheets.map((s) => ({ ...s, signOffs: signOffs.filter((a) => a.documentId === s.id) })));
  })
);

router.get(
  "/:id",
  requirePermission("accountingRecord", "read"),
  asyncHandler(async (req, res) => {
    const sheet = await prisma.balanceSheet.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    });
    if (!sheet) throw new NotFoundError("Bilanz nicht gefunden");
    const signOffs = await listSignOffs("BILANZ", [sheet.id]);
    res.json({ ...sheet, signOffs });
  })
);

router.post(
  "/",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = balanceSheetSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "BalanceSheet", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.balanceSheet.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            fiscalYear: parsed.data.fiscalYear,
            periodLabel: parsed.data.periodLabel,
            lineItems: { create: parsed.data.lineItems },
          },
          include: { lineItems: true },
        })
    );
    res.status(201).json(created);
  })
);

// Full replace of lineItems (draft-only) — the figures are re-submitted wholesale each edit,
// matching how the frontend form for a Bilanz/GuV works (one table, not per-row PATCH).
router.patch(
  "/:id",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = balanceSheetSchema.partial({ fiscalYear: true }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.balanceSheet.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { lineItems: true },
    });
    if (!before) throw new NotFoundError("Bilanz nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können bearbeitet werden.");

    const updated = await withAudit(
      { entityType: "BalanceSheet", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        if (parsed.data.lineItems) {
          await tx.balanceSheetLineItem.deleteMany({ where: { balanceSheetId: before.id } });
        }
        return tx.balanceSheet.update({
          where: { id: before.id },
          data: {
            periodLabel: parsed.data.periodLabel,
            lineItems: parsed.data.lineItems ? { create: parsed.data.lineItems } : undefined,
          },
          include: { lineItems: true },
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
    const before = await prisma.balanceSheet.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bilanz nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "BalanceSheet", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.balanceSheet.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

// Opens a new draft for correction, carrying the finalized figures forward as a starting point —
// the finalized row itself is never overwritten (previousVersionId keeps the chain intact).
router.post(
  "/:id/revise",
  requirePermission("accountingRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.balanceSheet.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { lineItems: true },
    });
    if (!before) throw new NotFoundError("Bilanz nicht gefunden");
    if (before.status !== "final") throw new ValidationError("Nur finale Dokumente können korrigiert werden.");

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "BalanceSheet", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.balanceSheet.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            fiscalYear: before.fiscalYear,
            periodLabel: before.periodLabel,
            previousVersionId: before.id,
            lineItems: {
              create: before.lineItems.map((li) => ({
                side: li.side,
                section: li.section,
                label: li.label,
                currentAmount: li.currentAmount,
                priorYearAmount: li.priorYearAmount,
                sortOrder: li.sortOrder,
              })),
            },
          },
          include: { lineItems: true },
        })
    );
    res.status(201).json(created);
  })
);

router.post(
  "/:id/acknowledge",
  requirePermission("accountingReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.balanceSheet.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!doc) throw new NotFoundError("Bilanz nicht gefunden");
    const ack = await acknowledgeAccountingDocument("BILANZ", doc, req.user!, req.ip);
    res.status(201).json(ack);
  })
);

export default router;
