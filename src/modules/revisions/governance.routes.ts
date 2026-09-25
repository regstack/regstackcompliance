import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

function toDates<T extends Record<string, unknown>>(data: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of keys) {
    const v = out[k as string];
    if (typeof v === "string") out[k as string] = new Date(v);
  }
  return out as T;
}

/* =====================================================================
 * revision_einstellungen — tenant-wide singleton, split across two independent endpoints
 * matching the frontend's own deliberate column-ownership split.
 * ===================================================================*/

router.get(
  "/einstellungen",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionEinstellungen.findUnique({ where: { institutionId: req.user!.institutionId } }));
  })
);

const orgFormSchema = z.object({
  orgForm: z.enum(["eigene_einheit", "geschaeftsleiter"]).optional(),
  disproportionalityReason: z.string().nullable().optional(),
  conflictMeasures: z.string().nullable().optional(),
  headOfAuditUserId: z.string().nullable().optional(),
  directSubordination: z.boolean().optional(),
  independenceConfirmed: z.boolean().optional(),
});

router.put(
  "/einstellungen/org-form",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = orgFormSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionEinstellungen.findUnique({ where: { institutionId: req.user!.institutionId } });
    const updated = await withAudit(
      { entityType: "RevisionEinstellungen", entityId: req.user!.institutionId, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionEinstellungen.upsert({
          where: { institutionId: req.user!.institutionId },
          create: { institutionId: req.user!.institutionId, updatedByUserId: req.user!.userId, ...parsed.data },
          update: { updatedByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.json(updated);
  })
);

const settingsSchema = z.object({
  severitySettings: z.record(z.any()).optional(),
  angemesseneZeitTage: z.number().int().optional(),
  qsIntervallMonate: z.number().int().nullable().optional(),
  risikoReviewIntervallMonate: z.number().int().nullable().optional(),
});

router.put(
  "/einstellungen",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionEinstellungen.findUnique({ where: { institutionId: req.user!.institutionId } });
    const updated = await withAudit(
      { entityType: "RevisionEinstellungen", entityId: req.user!.institutionId, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionEinstellungen.upsert({
          where: { institutionId: req.user!.institutionId },
          create: { institutionId: req.user!.institutionId, updatedByUserId: req.user!.userId, ...parsed.data },
          update: { updatedByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * revision_qualitaetssicherung — insert only.
 * ===================================================================*/

router.get(
  "/qs",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionQualitaetssicherung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { date: "desc" } }));
  })
);

const qsSchema = z.object({
  date: z.string().datetime(),
  type: z.enum(["regelmaessig", "anlassbezogen"]),
  anlass: z.string().optional(),
  scope: z.record(z.boolean()).optional(),
  reviewer: z.string().optional(),
  result: z.string().optional(),
  nextDue: z.string().datetime().nullable().optional(),
});

router.post(
  "/qs",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = qsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["date", "nextDue"]);
    const created = await withAudit(
      { entityType: "RevisionQualitaetssicherung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.revisionQualitaetssicherung.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

/* =====================================================================
 * revision_projektbegleitung — add + update, no delete.
 * ===================================================================*/

router.get(
  "/projektbegleitung",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionProjektbegleitung.findMany({ where: { institutionId: req.user!.institutionId } }));
  })
);

const projektSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(["laufend", "abgeschlossen"]).optional(),
  irContactUserId: z.string().nullable().optional(),
  accessGranted: z.boolean().optional(),
  notes: z.string().optional(),
});

router.post(
  "/projektbegleitung",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = projektSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["startDate", "endDate"]);
    const created = await withAudit(
      { entityType: "RevisionProjektbegleitung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.revisionProjektbegleitung.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/projektbegleitung/:id",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = projektSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionProjektbegleitung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Eintrag nicht gefunden");

    const data = toDates(parsed.data, ["startDate", "endDate"]);
    const updated = await withAudit(
      { entityType: "RevisionProjektbegleitung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionProjektbegleitung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * revision_zugriffsvorfaelle — add + update, no delete.
 * ===================================================================*/

router.get(
  "/zugriffsvorfaelle",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionZugriffsvorfall.findMany({ where: { institutionId: req.user!.institutionId } }));
  })
);

const vorfallSchema = z.object({
  date: z.string().datetime(),
  area: z.string().optional(),
  description: z.string().optional(),
  escalatedTo: z.string().optional(),
  resolvedDate: z.string().datetime().nullable().optional(),
});

router.post(
  "/zugriffsvorfaelle",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = vorfallSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["date", "resolvedDate"]);
    const created = await withAudit(
      { entityType: "RevisionZugriffsvorfall", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.revisionZugriffsvorfall.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/zugriffsvorfaelle/:id",
  requirePermission("revisionGovernance", "write"),
  asyncHandler(async (req, res) => {
    const parsed = vorfallSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionZugriffsvorfall.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Vorfall nicht gefunden");

    const data = toDates(parsed.data, ["date", "resolvedDate"]);
    const updated = await withAudit(
      { entityType: "RevisionZugriffsvorfall", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionZugriffsvorfall.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * revision_gl_mitteilungen — insert only. Writable by INTERNE_REVISION or GESCHAEFTSLEITUNG.
 * ===================================================================*/

router.get(
  "/gl-mitteilungen",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionGlMitteilung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { date: "desc" } }));
  })
);

const glMitteilungSchema = z.object({ date: z.string().datetime(), decision: z.string().min(1) });

router.post(
  "/gl-mitteilungen",
  requirePermission("revisionGovernance.glNotice", "write"),
  asyncHandler(async (req, res) => {
    const parsed = glMitteilungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionGlMitteilung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionGlMitteilung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, decision: parsed.data.decision, date: new Date(parsed.data.date) },
        })
    );
    res.status(201).json(created);
  })
);

/* =====================================================================
 * revision_sonderauftraege — insert only.
 * ===================================================================*/

router.get(
  "/sonderauftraege",
  requirePermission("revisionGovernance", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionSonderauftrag.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { date: "desc" } }));
  })
);

const sonderauftragSchema = z.object({ date: z.string().datetime(), orderedBy: z.string().optional(), subject: z.string().min(1), reason: z.string().optional() });

router.post(
  "/sonderauftraege",
  requirePermission("revisionGovernance.sonderauftrag", "write"),
  asyncHandler(async (req, res) => {
    const parsed = sonderauftragSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionSonderauftrag", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionSonderauftrag.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data, date: new Date(parsed.data.date) },
        })
    );
    res.status(201).json(created);
  })
);

export default router;
