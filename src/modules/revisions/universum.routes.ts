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
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    const objekte = await prisma.pruefungsobjekt.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(objekte);
  })
);

const objektSchema = z.object({
  bezeichnung: z.string().min(1),
  bereich: z.string().optional(),
  category: z.enum(["geschaeftsorganisation", "risikomanagement", "iks", "sonstige"]),
  outsourced: z.boolean().optional(),
  materiality: z.enum(["wesentlich", "nicht_wesentlich"]).optional(),
  risikokriterien: z.record(z.number()).optional(),
  riskRationale: z.record(z.any()).optional(),
  regAnker: z.string().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  status: z.enum(["aktiv", "inaktiv"]).optional(),
  riskReviewDate: z.string().datetime().nullable().optional(),
  riskReviewReviewerUserId: z.string().nullable().optional(),
  lastAuditDate: z.string().datetime().nullable().optional(),
  planYear: z.number().int().nullable().optional(),
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
    const parsed = objektSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["riskReviewDate", "lastAuditDate"]);
    const created = await withAudit(
      { entityType: "Pruefungsobjekt", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.pruefungsobjekt.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

/* =====================================================================
 * Jahresplan (audit_plans) — registered before "/:id" so "plans" is never mistaken for an
 * objekt id, matching the Compliance normen.routes.ts precedent.
 * ===================================================================*/

router.get(
  "/plans",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    const plans = await prisma.auditPlan.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { year: "desc" },
    });
    res.json(plans);
  })
);

const planSchema = z.object({ year: z.number().int(), content: z.record(z.any()).default({}) });

router.post(
  "/plans",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "AuditPlan", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.auditPlan.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data } })
    );
    res.status(201).json(created);
  })
);

const planContentSchema = z.object({ content: z.record(z.any()) });

router.patch(
  "/plans/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = planContentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.auditPlan.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Prüfungsplan nicht gefunden");

    const updated = await withAudit(
      { entityType: "AuditPlan", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.auditPlan.update({ where: { id: before.id }, data: { content: parsed.data.content } })
    );
    res.json(updated);
  })
);

router.patch(
  "/plans/:id/submit",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.auditPlan.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Prüfungsplan nicht gefunden");
    if (before.status !== "entwurf") throw new ValidationError("Nur Entwürfe können eingereicht werden.");

    const updated = await withAudit(
      { entityType: "AuditPlan", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.auditPlan.update({
          where: { id: before.id },
          data: { status: "eingereicht", submittedByUserId: req.user!.userId, submittedAt: new Date() },
        })
    );
    res.json(updated);
  })
);

// Geschäftsleitung-only — called both from this module's own Plan-Karte and from the Dashboard,
// consolidating what used to be two independent Supabase implementations (Phase 2 precedent).
router.patch(
  "/plans/:id/approve",
  requirePermission("revisionPlan.approve", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.auditPlan.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Prüfungsplan nicht gefunden");
    if (before.status !== "eingereicht") throw new ValidationError("Nur eingereichte Pläne können genehmigt werden.");

    const updated = await withAudit(
      { entityType: "AuditPlan", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.auditPlan.update({
          where: { id: before.id },
          data: { status: "genehmigt", approvedByUserId: req.user!.userId, approvedAt: new Date() },
        })
    );
    res.json(updated);
  })
);

router.get(
  "/:id",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    const objekt = await prisma.pruefungsobjekt.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!objekt) throw new NotFoundError("Prüfungsobjekt nicht gefunden");
    res.json(objekt);
  })
);

router.patch(
  "/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = objektSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.pruefungsobjekt.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Prüfungsobjekt nicht gefunden");

    const data = toDates(parsed.data, ["riskReviewDate", "lastAuditDate"]);
    const updated = await withAudit(
      { entityType: "Pruefungsobjekt", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.pruefungsobjekt.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

export default router;
