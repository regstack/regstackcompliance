import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { pdfHeading, pdfSection, renderPdf } from "../../utils/pdf";

const router = Router();

interface ResolvedAudit {
  subject?: string;
  overall_rating?: string;
  report_date?: string;
}
interface ResolvedFinding {
  titel?: string;
  schweregrad?: string;
  status?: string;
}
interface ResolvedPlanItem {
  bezeichnung?: string;
  materiality?: string;
}

router.get(
  "/",
  requirePermission("revisionReport", "read"),
  asyncHandler(async (req, res) => {
    const reportType = typeof req.query.reportType === "string" ? req.query.reportType : undefined;
    res.json(
      await prisma.revisionReport.findMany({
        where: { institutionId: req.user!.institutionId, reportType },
        orderBy: { periodFrom: "desc" },
      })
    );
  })
);

router.get(
  "/:id",
  requirePermission("revisionReport", "read"),
  asyncHandler(async (req, res) => {
    const report = await prisma.revisionReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!report) throw new NotFoundError("Bericht nicht gefunden");
    res.json(report);
  })
);

const reportSchema = z.object({
  reportType: z.enum(["quartalsbericht", "jahresbericht"]),
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
  content: z.record(z.any()).default({}),
});

router.post(
  "/",
  requirePermission("revisionReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionReport", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionReport.create({
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

const contentSchema = z.object({ content: z.record(z.any()) });

// Draft-only content edit (e.g. planAdherence) — separate from finalize, which is the one-way
// freeze.
router.patch(
  "/:id",
  requirePermission("revisionReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = contentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können bearbeitet werden.");

    const updated = await withAudit(
      { entityType: "RevisionReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionReport.update({ where: { id: before.id }, data: { content: parsed.data.content } })
    );
    res.json(updated);
  })
);

// Re-resolves the draft's content one last time before freezing — the frontend caller is
// responsible for building the fully denormalized content (resolvedAudits/resolvedCarryover/
// resolvedPlan); this endpoint just accepts it and flips the status, matching the existing
// generate-draft-then-finalize-and-freeze lifecycle.
const finalizeSchema = z.object({ content: z.record(z.any()).optional() });

router.post(
  "/:id/finalize",
  requirePermission("revisionReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = finalizeSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "RevisionReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionReport.update({
          where: { id: before.id },
          data: { status: "final", finalizedAt: new Date(), content: parsed.data.content ?? before.content ?? undefined },
        })
    );
    res.json(updated);
  })
);

// Single-value ack, "first confirmer wins" — matches this module's actual existing behavior
// (unlike Compliance, which had outgrown that model). A second call is a no-op, not an error.
router.post(
  "/:id/acknowledge",
  requirePermission("revisionReport.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.revisionReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "final") throw new ValidationError("Nur finale Berichte können zur Kenntnis genommen werden.");

    if (before.kenntnisnahmeAt) return res.json(before);

    const updated = await withAudit(
      { entityType: "RevisionReport", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionReport.update({
          where: { id: before.id },
          data: { kenntnisnahmeByUserId: req.user!.userId, kenntnisnahmeAt: new Date() },
        })
    );
    res.json(updated);
  })
);

// Rendert Quartals-/Jahresbericht als PDF aus dem bereits im Content-Feld denormalisierten Stand
// (siehe frontend/app/(app)/interne-revision/{quartalsbericht,jahresbericht}/actions.ts, das
// resolvedAudits/resolvedCarryover/resolvedPlan vor dem Finalisieren dort hineinschreibt).
router.get(
  "/:id/pdf",
  requirePermission("revisionReport", "read"),
  asyncHandler(async (req, res) => {
    const report = await prisma.revisionReport.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!report) throw new NotFoundError("Bericht nicht gefunden");

    const content = (report.content ?? {}) as {
      resolvedAudits?: ResolvedAudit[];
      resolvedCarryover?: ResolvedFinding[];
      resolvedPlan?: ResolvedPlanItem[];
      planAdherence?: string;
    };

    const title = report.reportType === "jahresbericht" ? "Jahresbericht der Internen Revision" : "Quartalsbericht der Internen Revision";
    const period = `${report.periodFrom?.toISOString().slice(0, 10) ?? "–"} – ${report.periodTo?.toISOString().slice(0, 10) ?? "–"}`;

    const buffer = await renderPdf((doc) => {
      pdfHeading(doc, title, `Zeitraum ${period} · Status: ${report.status === "final" ? "final" : "Entwurf"}`);

      if (content.planAdherence) pdfSection(doc, "Planeinhaltung", content.planAdherence);

      const audits = content.resolvedAudits ?? [];
      doc.fontSize(13).text(`Abgeschlossene Prüfungen (${audits.length})`);
      doc.moveDown(0.3);
      if (!audits.length) doc.fontSize(11).text("Keine Prüfung in diesem Berichtszeitraum.");
      audits.forEach((a) => doc.fontSize(10).text(`•  ${a.subject ?? "—"} — Gesamturteil: ${a.overall_rating ?? "–"} (${a.report_date ?? "–"})`));
      doc.moveDown(1);

      const findings = content.resolvedCarryover ?? [];
      doc.fontSize(13).text(`Offene Feststellungen (${findings.length})`);
      doc.moveDown(0.3);
      if (!findings.length) doc.fontSize(11).text("Keine offene Feststellung.");
      findings.forEach((f) => doc.fontSize(10).text(`•  ${f.titel ?? "—"} — Schweregrad: ${f.schweregrad ?? "–"} (${f.status ?? "–"})`));
      doc.moveDown(1);

      const plan = content.resolvedPlan ?? [];
      doc.fontSize(13).text(`Prüfungsplan / -universum (${plan.length})`);
      doc.moveDown(0.3);
      if (!plan.length) doc.fontSize(11).text("Kein Prüfungsobjekt zugeordnet.");
      plan.forEach((p) => doc.fontSize(10).text(`•  ${p.bezeichnung ?? "—"}${p.materiality ? ` (${p.materiality})` : ""}`));
      doc.moveDown(1);

      doc.fontSize(9).fillColor("#777").text(
        report.status === "final" && report.kenntnisnahmeAt
          ? `Kenntnisnahme durch die Geschäftsleitung am ${report.kenntnisnahmeAt.toISOString().slice(0, 10)}.`
          : report.status === "final"
            ? "Final — noch keine Kenntnisnahme durch die Geschäftsleitung."
            : "Entwurf — noch nicht finalisiert."
      );
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.reportType}-${period.replace(/[^a-z0-9]+/gi, "-")}.pdf"`);
    res.send(buffer);
  })
);

export default router;
