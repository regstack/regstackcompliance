import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { openFindingsBlockClosure } from "./validation";

const router = Router();

async function requirePruefung(id: string, institutionId: string) {
  const pruefung = await prisma.baitItPruefung.findFirst({ where: { id, institutionId } });
  if (!pruefung) throw new NotFoundError("IT-Prüfung nicht gefunden");
  return pruefung;
}

// Der optionale Informationsverbund-Link ist nie Pflicht (siehe Schema-Kommentar), aber wenn er
// gesetzt wird, muss er auf das eigene Institut zeigen — gleiche Mandantentrennungsregel wie bei
// jedem anderen Cross-Entity-Verweis in diesem Code (vgl. dora.routes.ts::requireActivityInSameInstitution).
async function requireInformationsverbundInSameInstitution(informationsverbundId: string, institutionId: string) {
  const verbund = await prisma.baitInformationsverbund.findFirst({ where: { id: informationsverbundId, institutionId } });
  if (!verbund) throw new NotFoundError("Informationsverbund nicht gefunden");
  return verbund;
}

router.get(
  "/",
  requirePermission("baitPruefung", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitItPruefung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { informationsverbund: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const baseSchema = z.object({
  informationsverbundId: z.string().uuid().nullable().optional(),
  subject: z.string().min(1),
  systemBezeichnung: z.string().optional(),
  scope: z.string().optional(),
  plannedDate: z.string().datetime().nullable().optional(),
  actualDate: z.string().datetime().nullable().optional(),
  pruefer: z.string().optional(),
  overallRating: z.string().optional(),
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
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = baseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    if (parsed.data.informationsverbundId) {
      await requireInformationsverbundInSameInstitution(parsed.data.informationsverbundId, req.user!.institutionId);
    }

    const id = randomUUID();
    const data = toDates(parsed.data, ["plannedDate", "actualDate"]);
    const created = await withAudit(
      { entityType: "BaitItPruefung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.baitItPruefung.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  requirePermission("baitPruefung", "read"),
  asyncHandler(async (req, res) => {
    const pruefung = await prisma.baitItPruefung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { informationsverbund: { select: { name: true } }, feststellungen: true },
    });
    if (!pruefung) throw new NotFoundError("IT-Prüfung nicht gefunden");
    res.json(pruefung);
  })
);

const updateSchema = baseSchema.partial();

router.patch(
  "/:id",
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);
    if (parsed.data.informationsverbundId) {
      await requireInformationsverbundInSameInstitution(parsed.data.informationsverbundId, req.user!.institutionId);
    }

    const data = toDates(parsed.data, ["plannedDate", "actualDate"]);
    const updated = await withAudit(
      { entityType: "BaitItPruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitItPruefung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

const statusSchema = z.object({ status: z.enum(["geplant", "laufend", "abgeschlossen"]) });

// Abschluss ist serverseitig gegen offene Feststellungen gesperrt (siehe validation.ts) — eine
// IT-Prüfung mit unerledigten Feststellungen kann nicht einfach auf "abgeschlossen" gesetzt werden.
router.patch(
  "/:id/status",
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requirePruefung(req.params.id, req.user!.institutionId);

    if (parsed.data.status === "abgeschlossen") {
      const findings = await prisma.baitItPruefungsfeststellung.findMany({
        where: { pruefungId: before.id },
        select: { status: true },
      });
      if (openFindingsBlockClosure(findings)) {
        throw new ValidationError(
          "IT-Prüfung kann nicht abgeschlossen werden: es gibt noch offene oder in Bearbeitung befindliche Feststellungen."
        );
      }
    }

    const updated = await withAudit(
      { entityType: "BaitItPruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitItPruefung.update({ where: { id: before.id }, data: { status: parsed.data.status } })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("baitPruefung", "delete"),
  asyncHandler(async (req, res) => {
    const before = await requirePruefung(req.params.id, req.user!.institutionId);

    await withAudit(
      { entityType: "BaitItPruefung", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        // Feststellungen hängen per FK an der Prüfung — erst die Feststellungen, dann die Prüfung
        // löschen, beides in derselben Transaktion wie der Audit-Eintrag.
        await tx.baitItPruefungsfeststellung.deleteMany({ where: { pruefungId: before.id } });
        return tx.baitItPruefung.delete({ where: { id: before.id } });
      }
    );
    res.status(204).end();
  })
);

export default router;
