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
  requirePermission("doraRegister", "read"),
  asyncHandler(async (req, res) => {
    const arrangements = await prisma.doraIctArrangement.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { createdAt: "asc" },
    });
    res.json(arrangements);
  })
);

const baseSchema = z.object({
  activityId: z.string().uuid().optional(),
  registerLevel: z.enum(["ENTITY", "SUB_CONSOLIDATED", "CONSOLIDATED"]).optional(),
  providerName: z.string().min(1),
  providerLei: z.string().optional(),
  providerCountry: z.string().optional(),
  providerAddress: z.string().optional(),
  serviceType: z.string().min(1),
  contractStart: z.string().datetime().optional(),
  contractEnd: z.string().datetime().optional(),
  terminationNoticeMonths: z.number().int().optional(),
  criticalOrImportantFunction: z.boolean().optional(),
  criticalityRationale: z.string().optional(),
  isCriticalIctProvider: z.boolean().optional(),
  dataProcessingCountries: z.string().optional(),
});

const createSchema = baseSchema;

// Verifies (if given) that activityId belongs to the caller's institution and actually carries
// scope=IKT_DORA — the register entry is meant to sit on top of that existing flag, not on an
// arbitrary Auslagerung (see activities.routes.ts, ScopeType.IKT_DORA).
async function requireDoraScopedActivity(activityId: string, institutionId: string) {
  const activity = await prisma.outsourcingActivity.findFirst({ where: { id: activityId, institutionId } });
  if (!activity) throw new NotFoundError("Auslagerungsaktivität nicht gefunden");
  if (activity.scope !== "IKT_DORA") {
    throw new ValidationError('Verknüpfte Aktivität muss scope="IKT_DORA" haben');
  }
  return activity;
}

router.post(
  "/",
  requirePermission("doraRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    // Analog zu scopeJustification bei OutsourcingActivity: eine als "kritisch oder wichtig"
    // markierte Funktion braucht eine nachvollziehbare Begründung, sonst bleibt es Behauptung.
    if (parsed.data.criticalOrImportantFunction && !parsed.data.criticalityRationale) {
      throw new ValidationError("criticalityRationale ist Pflicht, sobald criticalOrImportantFunction gesetzt ist");
    }
    if (parsed.data.activityId) {
      await requireDoraScopedActivity(parsed.data.activityId, req.user!.institutionId);
    }

    const { contractStart, contractEnd, ...rest } = parsed.data;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "DoraIctArrangement", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.doraIctArrangement.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            ...rest,
            contractStart: contractStart ? new Date(contractStart) : undefined,
            contractEnd: contractEnd ? new Date(contractEnd) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  requirePermission("doraRegister", "read"),
  asyncHandler(async (req, res) => {
    const arrangement = await prisma.doraIctArrangement.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { subOutsourcings: true },
    });
    if (!arrangement) throw new NotFoundError("DORA-Arrangement nicht gefunden");
    res.json(arrangement);
  })
);

const updateSchema = baseSchema.partial().extend({
  approvedByUserId: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  lastReviewDate: z.string().datetime().optional(),
  nextReviewDueAt: z.string().datetime().optional(),
  status: z.enum(["ENTWURF", "AKTIV", "BEENDET"]).optional(),
});

router.patch(
  "/:id",
  requirePermission("doraRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.doraIctArrangement.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("DORA-Arrangement nicht gefunden");

    const criticalOrImportantFunction = parsed.data.criticalOrImportantFunction ?? before.criticalOrImportantFunction;
    const criticalityRationale = parsed.data.criticalityRationale ?? before.criticalityRationale;
    if (criticalOrImportantFunction && !criticalityRationale) {
      throw new ValidationError("criticalityRationale ist Pflicht, sobald criticalOrImportantFunction gesetzt ist");
    }
    if (parsed.data.activityId) {
      await requireDoraScopedActivity(parsed.data.activityId, req.user!.institutionId);
    }

    const data: Record<string, unknown> = { ...parsed.data };
    for (const field of ["contractStart", "contractEnd", "approvedAt", "lastReviewDate", "nextReviewDueAt"] as const) {
      if (data[field]) data[field] = new Date(data[field] as string);
    }

    const updated = await withAudit(
      { entityType: "DoraIctArrangement", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.doraIctArrangement.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("doraRegister", "delete"),
  asyncHandler(async (req, res) => {
    const before = await prisma.doraIctArrangement.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("DORA-Arrangement nicht gefunden");

    await withAudit(
      { entityType: "DoraIctArrangement", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        // Sub-Kette hat eine RESTRICT-FK auf arrangementId — erst die Kette, dann das Arrangement
        // löschen, beides in derselben Transaktion wie der Audit-Eintrag.
        await tx.doraWeiterverlagerung.deleteMany({ where: { arrangementId: before.id } });
        return tx.doraIctArrangement.delete({ where: { id: before.id } });
      }
    );
    res.status(204).end();
  })
);

export default router;
