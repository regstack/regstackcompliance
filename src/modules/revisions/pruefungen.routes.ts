import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { isSelfReview, auditCloseBlocked } from "./paper-checks";

const router = Router();

async function requirePruefung(id: string, institutionId: string) {
  const pruefung = await prisma.pruefung.findFirst({ where: { id, institutionId } });
  if (!pruefung) throw new NotFoundError("Prüfung nicht gefunden");
  return pruefung;
}

router.get(
  "/",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.pruefung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { pruefungsobjekt: { select: { bezeichnung: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const pruefungSchema = z.object({
  pruefungsobjektId: z.string().nullable().optional(),
  subject: z.string().min(1),
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
  preparedBy: z.string().optional(),
  reportDate: z.string().datetime().nullable().optional(),
  presentedTo: z.string().optional(),
  presentedDate: z.string().datetime().nullable().optional(),
  workpaperRef: z.string().optional(),
  durchfuehrung: z.enum(["intern", "ausgelagert", "gemischt"]).optional(),
  overallRating: z.string().optional(),
  budgetDays: z.number().int().nullable().optional(),
  actualDays: z.number().int().nullable().optional(),
  externDienstleister: z.string().optional(),
  externAblage: z.string().optional(),
  externEinsicht: z.array(z.record(z.any())).optional(),
  qsChecklist: z.array(z.record(z.any())).optional(),
});

function toDates<T extends Record<string, unknown>>(data: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of keys) {
    const v = out[k as string];
    if (typeof v === "string") out[k as string] = new Date(v);
  }
  return out as T;
}

router.post(
  "/",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = pruefungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["periodFrom", "periodTo", "reportDate", "presentedDate"]);
    const created = await withAudit(
      { entityType: "Pruefung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.pruefung.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    await requirePruefung(req.params.id, req.user!.institutionId);
    res.json(
      await prisma.pruefung.findFirst({
        where: { id: req.params.id, institutionId: req.user!.institutionId },
        include: { pruefungsobjekt: { select: { bezeichnung: true } } },
      })
    );
  })
);

router.patch(
  "/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = pruefungSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);
    const data = toDates(parsed.data, ["periodFrom", "periodTo", "reportDate", "presentedDate"]);
    const updated = await withAudit(
      { entityType: "Pruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

async function papersForPruefung(pruefungId: string) {
  return prisma.arbeitspapier.findMany({ where: { schritt: { pruefungId } } });
}

const statusSchema = z.object({ status: z.enum(["geplant", "laufend", "abgeschlossen"]) });

// Closing a Prüfung is gated server-side now (see paper-checks.ts) — the old frontend only ever
// warned about this with a banner, nothing stopped the save.
router.patch(
  "/:id/status",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);

    if (parsed.data.status === "abgeschlossen") {
      const papers = await papersForPruefung(before.id);
      if (auditCloseBlocked(papers)) {
        throw new ValidationError(
          "Prüfung kann nicht abgeschlossen werden: es gibt noch nicht freigegebene oder im Vier-Augen-Prinzip verletzte Arbeitspapiere."
        );
      }
    }

    const updated = await withAudit(
      { entityType: "Pruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefung.update({ where: { id: before.id }, data: { status: parsed.data.status } })
    );
    res.json(updated);
  })
);

const qsChecklistSchema = z.object({ qsChecklist: z.array(z.record(z.any())) });

router.patch(
  "/:id/qs-checklist",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = qsChecklistSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);
    const updated = await withAudit(
      { entityType: "Pruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefung.update({ where: { id: before.id }, data: { qsChecklist: parsed.data.qsChecklist } })
    );
    res.json(updated);
  })
);

// Free-form: the QS panel lets the user pick any person and any date for both "completed by/at"
// and "reviewed by/at" (not just "mark as done by me"), so this takes the four fields directly
// rather than stamping the current user/now.
const qsMetaSchema = z.object({
  qsCompletedByUserId: z.string().nullable().optional(),
  qsCompletedAt: z.string().datetime().nullable().optional(),
  qsReviewedByUserId: z.string().nullable().optional(),
  qsReviewedAt: z.string().datetime().nullable().optional(),
});

router.patch(
  "/:id/qs-meta",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = qsMetaSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);
    const data = toDates(parsed.data, ["qsCompletedAt", "qsReviewedAt"]);
    const updated = await withAudit(
      { entityType: "Pruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * Zuweisungen (team assignments) — insert/delete only, matching today's frontend capability.
 * ===================================================================*/

router.get(
  "/:id/zuweisungen",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    await requirePruefung(req.params.id, req.user!.institutionId);
    res.json(await prisma.pruefungZuweisung.findMany({ where: { pruefungId: req.params.id } }));
  })
);

const zuweisungSchema = z.object({ userId: z.string().min(1), role: z.enum(["leitung", "pruefer", "reviewer"]) });

router.post(
  "/:id/zuweisungen",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = zuweisungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    await requirePruefung(req.params.id, req.user!.institutionId);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "PruefungZuweisung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.pruefungZuweisung.create({
          data: { id, pruefungId: req.params.id, userId: parsed.data.userId, role: parsed.data.role, createdByUserId: req.user!.userId },
        })
    );
    res.status(201).json(created);
  })
);

router.delete(
  "/:id/zuweisungen/:zuweisungId",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const zuweisung = await prisma.pruefungZuweisung.findFirst({ where: { id: req.params.zuweisungId, pruefungId: req.params.id } });
    if (!zuweisung) throw new NotFoundError("Zuweisung nicht gefunden");

    await withAudit(
      { entityType: "PruefungZuweisung", entityId: zuweisung.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before: zuweisung },
      (tx) => tx.pruefungZuweisung.delete({ where: { id: zuweisung.id } })
    );
    res.status(204).end();
  })
);

/* =====================================================================
 * Pruefungsschritte (Arbeitsprogramm, Tz. 10)
 * ===================================================================*/

router.get(
  "/:id/schritte",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    await requirePruefung(req.params.id, req.user!.institutionId);
    res.json(await prisma.pruefungsschritt.findMany({ where: { pruefungId: req.params.id }, orderBy: { nummer: "asc" } }));
  })
);

const schrittSchema = z.object({
  nummer: z.number().int(),
  bereich: z.string().optional(),
  risiko: z.string().optional(),
  handlung: z.string().optional(),
  sollAussage: z.string().optional(),
  testschritte: z.string().optional(),
  ergebnis: z.string().optional(),
  beurteilung: z.string().optional(),
});

router.post(
  "/:id/schritte",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = schrittSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    await requirePruefung(req.params.id, req.user!.institutionId);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Pruefungsschritt", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.pruefungsschritt.create({ data: { id, pruefungId: req.params.id, createdByUserId: req.user!.userId, ...parsed.data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/schritte/:schrittId",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = schrittSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.pruefungsschritt.findFirst({
      where: { id: req.params.schrittId, pruefung: { institutionId: req.user!.institutionId } },
    });
    if (!before) throw new NotFoundError("Prüfungsschritt nicht gefunden");

    const updated = await withAudit(
      { entityType: "Pruefungsschritt", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefungsschritt.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

router.delete(
  "/schritte/:schrittId",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.pruefungsschritt.findFirst({
      where: { id: req.params.schrittId, pruefung: { institutionId: req.user!.institutionId } },
    });
    if (!before) throw new NotFoundError("Prüfungsschritt nicht gefunden");

    await withAudit(
      { entityType: "Pruefungsschritt", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefungsschritt.delete({ where: { id: before.id } })
    );
    res.status(204).end();
  })
);

/* =====================================================================
 * Arbeitspapiere (workpapers, Tz. 10) — the 4-eyes gate lives on the review-status transition.
 * ===================================================================*/

router.get(
  "/:id/arbeitspapiere",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    await requirePruefung(req.params.id, req.user!.institutionId);
    res.json(await papersForPruefung(req.params.id));
  })
);

router.get(
  "/schritte/:schrittId/arbeitspapiere",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.arbeitspapier.findMany({ where: { schrittId: req.params.schrittId }, orderBy: { createdAt: "asc" } }));
  })
);

const paperSchema = z.object({
  nummer: z.string().optional(),
  titel: z.string(), // blank on creation ("" placeholder row), filled in via a later PATCH
  typ: z.string().optional(),
  handlung: z.string().optional(),
  erstellerUserId: z.string().nullable().optional(),
  erstelltAm: z.string().datetime().nullable().optional(),
  inhalt: z.string().optional(),
  quelle: z.string().optional(),
  stichprobe: z.record(z.any()).optional(),
  ergebnis: z.string().optional(),
  reviewerUserId: z.string().nullable().optional(),
  reviewAm: z.string().datetime().nullable().optional(),
  reviewStatus: z.enum(["in_arbeit", "vorgelegt", "freigegeben", "nachbesserung"]).optional(),
  reviewKommentar: z.string().optional(),
});

function validatePaperSelfReview(reviewStatus: string | undefined, reviewerUserId: string | null | undefined, erstellerUserId: string | null | undefined) {
  if (reviewStatus === "freigegeben" && isSelfReview(reviewerUserId, erstellerUserId)) {
    throw new ValidationError("Vier-Augen-Prinzip verletzt: Reviewer und Ersteller dürfen bei der Freigabe nicht identisch sein.");
  }
}

router.post(
  "/schritte/:schrittId/arbeitspapiere",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = paperSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    validatePaperSelfReview(parsed.data.reviewStatus, parsed.data.reviewerUserId, parsed.data.erstellerUserId);

    const schritt = await prisma.pruefungsschritt.findFirst({
      where: { id: req.params.schrittId, pruefung: { institutionId: req.user!.institutionId } },
    });
    if (!schritt) throw new NotFoundError("Prüfungsschritt nicht gefunden");

    const id = randomUUID();
    const data = toDates(parsed.data, ["erstelltAm", "reviewAm"]);
    const created = await withAudit(
      { entityType: "Arbeitspapier", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.arbeitspapier.create({ data: { id, schrittId: schritt.id, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/arbeitspapiere/:paperId",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = paperSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.arbeitspapier.findFirst({
      where: { id: req.params.paperId, schritt: { pruefung: { institutionId: req.user!.institutionId } } },
    });
    if (!before) throw new NotFoundError("Arbeitspapier nicht gefunden");

    const nextReviewStatus = parsed.data.reviewStatus ?? before.reviewStatus;
    const nextReviewer = parsed.data.reviewerUserId !== undefined ? parsed.data.reviewerUserId : before.reviewerUserId;
    const nextErsteller = parsed.data.erstellerUserId !== undefined ? parsed.data.erstellerUserId : before.erstellerUserId;
    validatePaperSelfReview(nextReviewStatus, nextReviewer, nextErsteller);

    const data = toDates(parsed.data, ["erstelltAm", "reviewAm"]);
    const updated = await withAudit(
      { entityType: "Arbeitspapier", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.arbeitspapier.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

router.delete(
  "/arbeitspapiere/:paperId",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.arbeitspapier.findFirst({
      where: { id: req.params.paperId, schritt: { pruefung: { institutionId: req.user!.institutionId } } },
    });
    if (!before) throw new NotFoundError("Arbeitspapier nicht gefunden");

    await withAudit(
      { entityType: "Arbeitspapier", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.arbeitspapier.delete({ where: { id: before.id } })
    );
    res.status(204).end();
  })
);

export default router;
