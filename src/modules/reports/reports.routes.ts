import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";
import { pdfHeading, pdfSection, renderPdf } from "../../utils/pdf";

const router = Router();

router.get(
  "/",
  requirePermission("report", "read"),
  requireAccessGrant("OUTSOURCING"),
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

// Rendert denselben Bericht als PDF — ergänzt den bisher rein strukturierten Datensatz um ein
// Dokument, das sich an eine Geschäftsleitung oder einen Prüfer weitergeben lässt.
router.get(
  "/:id/pdf",
  requirePermission("report", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!report) throw new NotFoundError("Bericht nicht gefunden");

    const institution = await prisma.institutionProfile.findUniqueOrThrow({ where: { id: req.user!.institutionId } });
    const activityIds = Array.isArray(report.includedActivityIds) ? (report.includedActivityIds as unknown[]).filter((v): v is string => typeof v === "string") : [];
    const activities = activityIds.length
      ? await prisma.outsourcingActivity.findMany({ where: { id: { in: activityIds } }, select: { name: true, provider: true, category: true } })
      : [];

    const buffer = await renderPdf((doc) => {
      pdfHeading(
        doc,
        `Bericht über die Auslagerungen — ${institution.name}`,
        `Zeitraum ${report.period} · ${report.format === "VORSTANDSSITZUNGSPROTOKOLL" ? "Vorstandssitzungsprotokoll" : "Schriftlicher Bericht"} (Tz. 13) · Status: ${report.status === "GENEHMIGT" ? "genehmigt" : "Entwurf"}`
      );
      pdfSection(doc, "1. Vertragslage", report.conclusionContract);
      pdfSection(doc, "2. Steuerbarkeit", report.conclusionSteuerbarkeit);
      pdfSection(doc, "3. Eingeleitete Maßnahmen", report.conclusionMassnahmen);

      doc.fontSize(13).text(`Einbezogene Auslagerungen (${activities.length})`);
      doc.moveDown(0.3);
      if (!activities.length) doc.fontSize(11).text("Keine Auslagerung zugeordnet.");
      activities.forEach((a) => doc.fontSize(10).text(`•  ${a.name} — ${a.category}${a.provider ? ` (${a.provider})` : ""}`));
      doc.moveDown(1);

      doc.fontSize(9).fillColor("#777").text(
        report.status === "GENEHMIGT"
          ? `Kenntnisnahme durch die Geschäftsleitung am ${report.approvedAt?.toISOString().slice(0, 10) ?? "–"}.`
          : "Entwurf — noch keine Kenntnisnahme durch die Geschäftsleitung."
      );
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="bericht-auslagerungen-${report.period.replace(/[^a-z0-9]+/gi, "-")}.pdf"`);
    res.send(buffer);
  })
);

export default router;
