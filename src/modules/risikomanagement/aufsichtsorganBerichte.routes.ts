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
  requirePermission("supervisoryBoardReport", "read"),
  asyncHandler(async (req, res) => {
    const reports = await prisma.aufsichtsorganBericht.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { periodFrom: "desc" },
    });
    res.json(reports);
  })
);

const reportSchema = z.object({
  periodFrom: z.string().datetime().nullable().optional(),
  periodTo: z.string().datetime().nullable().optional(),
  content: z.record(z.any()).default({}),
});

router.post(
  "/",
  requirePermission("supervisoryBoardReport", "write"),
  asyncHandler(async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "AufsichtsorganBericht", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.aufsichtsorganBericht.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
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
  requirePermission("supervisoryBoardReport", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.aufsichtsorganBericht.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können finalisiert werden.");

    const updated = await withAudit(
      { entityType: "AufsichtsorganBericht", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.aufsichtsorganBericht.update({ where: { id: before.id }, data: { status: "final", finalizedAt: new Date() } })
    );
    res.json(updated);
  })
);

// Dokumentiert die tatsächliche Übermittlung an das Aufsichtsorgan — das Aufsichtsorgan selbst hat
// keinen RegStack-Login, deshalb kein Kenntnisnahme-Endpunkt wie bei RmReport/ComplianceReport;
// dieser Schritt ist der Nachweis dafür, dass AT 3.2 nicht nur intern finalisiert, sondern auch
// erfüllt wurde.
router.post(
  "/:id/mark-sent",
  requirePermission("supervisoryBoardReport", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.aufsichtsorganBericht.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Bericht nicht gefunden");
    if (before.status !== "final") throw new ValidationError("Nur finale Berichte können als versendet markiert werden.");

    const updated = await withAudit(
      { entityType: "AufsichtsorganBericht", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.aufsichtsorganBericht.update({
          where: { id: before.id },
          data: { status: "versendet", versendetAm: new Date(), versendetVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
