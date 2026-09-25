import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";
import { classify } from "./classify";
import { materialityIds, secondDimensionIds } from "./criteria";

const router = Router();

router.get(
  "/",
  requirePermission("outsourcingActivity", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const activities = await prisma.outsourcingActivity.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { riskAnalysis: true, handlungsoption: true, contract: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(activities);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  provider: z.string().optional(),
  scope: z.enum(["AUSLAGERUNG", "SONSTIGER_FREMDBEZUG", "IKT_DORA"]),
  scopeJustification: z.string().optional(),
});

router.post(
  "/",
  requirePermission("outsourcingActivity", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    // Tz. 1 — Scope-Abweichung von "Auslagerung" erfordert eine Begründung, sonst bleibt die
    // Abgrenzung eine reine Behauptung (siehe AT9_Vollstaendigkeitspruefung_und_Backend_Verifikation.md).
    if (parsed.data.scope !== "AUSLAGERUNG" && !parsed.data.scopeJustification) {
      throw new ValidationError('scopeJustification ist Pflicht, sobald scope von "AUSLAGERUNG" abweicht (Tz. 1)');
    }

    // Pre-generate the id so the audit row's entityId is known up front — Prisma's
    // @default(uuid()) is applied client-side, so this is the same id the insert will use.
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "OutsourcingActivity", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.outsourcingActivity.create({
          data: { id, institutionId: req.user!.institutionId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

// Institution-wide feed for the Geschäftsleitung dashboard — the per-activity GET already includes
// monitoringRecords, but the list endpoint above deliberately doesn't (would be a lot of dead
// weight on every register load), so escalations need their own cross-activity query. Registered
// before "/:id" so Express doesn't match "monitoring" as an activity id.
router.get(
  "/monitoring/escalations",
  requirePermission("monitoring", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const records = await prisma.monitoringRecord.findMany({
      where: {
        type: "EVIDENCE_LOG",
        escalationNeeded: true,
        activity: { institutionId: req.user!.institutionId },
      },
      include: { activity: { select: { id: true, name: true } } },
      orderBy: { evidenceDate: "desc" },
    });
    res.json(records);
  })
);

// Institution-wide KPI/KRI feed for the sidebar's KPI/KRI-Monitoring view — same cross-activity
// pattern as /monitoring/escalations above (the per-activity GET already includes
// monitoringRecords, the list endpoint deliberately doesn't).
router.get(
  "/monitoring/kpis",
  requirePermission("monitoring", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const records = await prisma.monitoringRecord.findMany({
      where: {
        type: "KPI",
        activity: { institutionId: req.user!.institutionId },
      },
      include: { activity: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(records);
  })
);

router.get(
  "/:id",
  requirePermission("outsourcingActivity", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { riskAnalysis: true, contract: true, handlungsoption: true, monitoringRecords: true },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");
    res.json(activity);
  })
);

const stammdatenSchema = createSchema.partial().extend({
  bafinReferenceNumber: z.string().optional(),
  contractStart: z.string().datetime().optional(),
  contractEnd: z.string().datetime().optional(),
  terminationNoticeMonths: z.number().int().optional(),
  serviceLocations: z.string().optional(),
  dataCategories: z.string().optional(),
  isCloud: z.boolean().optional(),
  isSubOutsourcing: z.boolean().optional(),
  groupInternal: z.boolean().optional(),
  specialFunction: z.enum(["KEINE", "RISIKOCONTROLLING", "COMPLIANCE", "INTERNE_REVISION", "KERNBANKBEREICH"]).optional(),
  deepDive: z.boolean().optional(),
});

router.patch(
  "/:id",
  requirePermission("outsourcingActivity", "write"),
  asyncHandler(async (req, res) => {
    const parsed = stammdatenSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Auslagerung nicht gefunden");

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.contractStart) data.contractStart = new Date(data.contractStart as string);
    if (data.contractEnd) data.contractEnd = new Date(data.contractEnd as string);

    const updated = await withAudit(
      { entityType: "OutsourcingActivity", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.outsourcingActivity.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

const ratingsSchema = z.object({
  quickTriggers: z.record(z.boolean()).optional(),
  materialityRatings: z.record(z.number().min(1).max(5)).optional(),
  secondDimensionRatings: z.record(z.number().min(1).max(5)).optional(),
  criticality: z.enum(["OFFEN", "KRITISCH", "NICHT_KRITISCH"]).optional(),
  criticalityReason: z.string().optional(),
  overrideActive: z.boolean().optional(),
  overrideMaterial: z.boolean().nullable().optional(),
  overrideCritical: z.boolean().nullable().optional(),
  overrideReason: z.string().optional(),
  overrideApprover: z.string().optional(),
});

// Recomputes the classification server-side on every rating change — the frontend may show a
// live preview, but the stored `materiality` value is always this server-computed (or explicitly
// overridden) result, never a value the client posts directly.
router.put(
  "/:id/risk-analysis",
  requirePermission("riskAnalysis", "write"),
  asyncHandler(async (req, res) => {
    const parsed = ratingsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { riskAnalysis: true },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    const institution = await prisma.institutionProfile.findUniqueOrThrow({ where: { id: req.user!.institutionId } });

    const quickTriggers = { ...(activity.riskAnalysis?.quickTriggers as Record<string, boolean>), ...parsed.data.quickTriggers };
    const materialityRatings = {
      ...(activity.riskAnalysis?.materialityRatings as Record<string, number>),
      ...parsed.data.materialityRatings,
    };
    const secondDimensionRatings = {
      ...(activity.riskAnalysis?.secondDimensionRatings as Record<string, number>),
      ...parsed.data.secondDimensionRatings,
    };

    const result = classify(
      materialityRatings,
      secondDimensionRatings,
      materialityIds(activity.deepDive),
      secondDimensionIds(institution.calculationModel, activity.deepDive),
      quickTriggers,
      institution
    );

    const overrideActive = parsed.data.overrideActive ?? activity.riskAnalysis?.overrideActive ?? false;
    const overrideMaterial = parsed.data.overrideMaterial ?? activity.riskAnalysis?.overrideMaterial ?? null;
    if (overrideActive && overrideMaterial === null) {
      throw new ValidationError("Override aktiv, aber keine finale Einstufung angegeben");
    }
    const materiality = overrideActive && overrideMaterial !== null ? overrideMaterial : result.computedMaterial;

    const before = activity.riskAnalysis as unknown as Record<string, unknown> | null;

    const updated = await withAudit(
      { entityType: "RiskAnalysis", entityId: activity.id, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.riskAnalysis.upsert({
          where: { activityId: activity.id },
          create: {
            activityId: activity.id,
            quickTriggers,
            materialityRatings,
            secondDimensionRatings,
            materialityScore: result.materialityScore,
            secondScore: result.secondScore,
            inherentScore: result.inherentScore,
            computedMaterial: result.computedMaterial,
            criticalSuggestion: result.criticalSuggestion,
            materiality,
            criticality: parsed.data.criticality ?? "OFFEN",
            criticalityReason: parsed.data.criticalityReason,
            overrideActive,
            overrideMaterial,
            overrideCritical: parsed.data.overrideCritical ?? null,
            overrideReason: parsed.data.overrideReason,
            overrideApprover: parsed.data.overrideApprover,
            overrideDate: overrideActive ? new Date() : null,
            classifiedByUserId: req.user!.userId,
            classifiedAt: new Date(),
          },
          update: {
            quickTriggers,
            materialityRatings,
            secondDimensionRatings,
            materialityScore: result.materialityScore,
            secondScore: result.secondScore,
            inherentScore: result.inherentScore,
            computedMaterial: result.computedMaterial,
            criticalSuggestion: result.criticalSuggestion,
            materiality,
            criticality: parsed.data.criticality ?? undefined,
            criticalityReason: parsed.data.criticalityReason ?? undefined,
            overrideActive,
            overrideMaterial,
            overrideCritical: parsed.data.overrideCritical ?? undefined,
            overrideReason: parsed.data.overrideReason ?? undefined,
            overrideApprover: parsed.data.overrideApprover ?? undefined,
            overrideDate: overrideActive ? new Date() : null,
            classifiedByUserId: req.user!.userId,
            classifiedAt: new Date(),
          },
        })
    );
    res.json({ ...updated, tier: result.tier, basis: result.basis });
  })
);

const statusSchema = z.object({ status: z.enum(["ENTWURF", "AKTIV", "BEENDET"]) });

// Aktivierungs-Gate — exact server-side mirror of activationBlockers() in regstack_cockpit.html:
// a materially-outsourced activity cannot go ENTWURF -> AKTIV without either group relief, or
// both a Handlungsoption/Ausstiegsstrategie AND a complete Tz.7 contract checklist. Every other
// transition (AKTIV -> BEENDET, or a correction back to ENTWURF) is unrestricted.
router.patch(
  "/:id/status",
  requirePermission("outsourcingActivity", "write"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { riskAnalysis: true, handlungsoption: true, contract: true },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    if (
      activity.status === "ENTWURF" &&
      parsed.data.status === "AKTIV" &&
      activity.scope === "AUSLAGERUNG" &&
      activity.riskAnalysis?.materiality
    ) {
      const institution = await prisma.institutionProfile.findUniqueOrThrow({ where: { id: req.user!.institutionId } });
      const relief = institution.groupRelief && activity.groupInternal;
      if (!relief) {
        const blockers: string[] = [];
        if (!activity.handlungsoption?.status) blockers.push("Handlungsoption/Ausstiegsstrategie fehlt (Tz. 6)");
        const checklist = (activity.contract?.clauseChecklist as Record<string, string>) ?? {};
        const openCount = Object.values(checklist).filter((v) => v !== "ERFUELLT").length;
        if (openCount > 0) blockers.push(`${openCount} Vertragspunkt(e) gem. Tz. 7 noch nicht erfüllt`);
        if (blockers.length) throw new ForbiddenError(`Aktivierung nicht gedeckt: ${blockers.join(" · ")}`);
      }
    }

    const updated = await withAudit(
      { entityType: "OutsourcingActivity", entityId: activity.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: activity },
      (tx) => tx.outsourcingActivity.update({ where: { id: activity.id }, data: { status: parsed.data.status } })
    );
    res.json(updated);
  })
);

export default router;
