import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

/* =====================================================================
 * IT-Notfallpläne — BAIT Kap. 10.3 (Wiederanlauf-/Notbetriebs-/
 * Wiederherstellungspläne je zeitkritischem System/Prozess).
 * ===================================================================*/

router.get(
  "/plaene",
  requirePermission("itContingencyRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const plaene = await prisma.itNotfallplan.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(plaene);
  })
);

const planSchema = z.object({
  assetId: z.string().nullable().optional(),
  bezeichnung: z.string().min(1),
  rto: z.string().nullable().optional(),
  rpo: z.string().nullable().optional(),
  konfigurationNotbetrieb: z.string().nullable().optional(),
  abhaengigkeiten: z.string().nullable().optional(),
});

router.post(
  "/plaene",
  requirePermission("itContingencyRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    if (parsed.data.assetId) {
      const asset = await prisma.itAsset.findFirst({ where: { id: parsed.data.assetId, institutionId: req.user!.institutionId } });
      if (!asset) throw new ValidationError("Referenziertes IT-Asset nicht gefunden");
    }

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ItNotfallplan", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itNotfallplan.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = planSchema.partial();

router.put(
  "/plaene/:id",
  requirePermission("itContingencyRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itNotfallplan.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Notfallplan nicht gefunden");

    const updated = await withAudit(
      { entityType: "ItNotfallplan", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.itNotfallplan.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

router.post(
  "/plaene/:id/freigeben",
  requirePermission("itContingencyRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itNotfallplan.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Notfallplan nicht gefunden");
    if (before.status === "freigegeben") throw new ValidationError("IT-Notfallplan bereits freigegeben");

    const updated = await withAudit(
      { entityType: "ItNotfallplan", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itNotfallplan.update({
          where: { id: before.id },
          data: { status: "freigegeben", freigegebenVonUserId: req.user!.userId, freigegebenAm: new Date() },
        })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * IT-Notfalltests — BAIT Kap. 10.4 (mindestens jährliche Wirksamkeitstests
 * je Notfallplan).
 * ===================================================================*/

router.get(
  "/plaene/:planId/tests",
  requirePermission("itContingencyRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const plan = await prisma.itNotfallplan.findFirst({ where: { id: req.params.planId, institutionId: req.user!.institutionId } });
    if (!plan) throw new NotFoundError("IT-Notfallplan nicht gefunden");

    const tests = await prisma.itNotfalltest.findMany({
      where: { notfallplanId: plan.id, institutionId: req.user!.institutionId },
      orderBy: { datum: "desc" },
    });
    res.json(tests);
  })
);

const testSchema = z.object({
  datum: z.string().datetime(),
  umfang: z.string().nullable().optional(),
  ergebnis: z.string().nullable().optional(),
  abgeleiteteMassnahmen: z.string().nullable().optional(),
});

router.post(
  "/plaene/:planId/tests",
  requirePermission("itContingencyRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const plan = await prisma.itNotfallplan.findFirst({ where: { id: req.params.planId, institutionId: req.user!.institutionId } });
    if (!plan) throw new NotFoundError("IT-Notfallplan nicht gefunden");

    const id = randomUUID();
    const { datum, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItNotfalltest", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itNotfalltest.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            notfallplanId: plan.id,
            createdByUserId: req.user!.userId,
            durchgefuehrtVonUserId: req.user!.userId,
            datum: new Date(datum),
            ...rest,
          },
        })
    );

    // Tz. 10.4 knüpft an den jährlichen Test — hält den Plan auf dem aktuellen Stand, ohne einen
    // zweiten Aufruf gegen /plaene/:id zu verlangen.
    await withAudit(
      { entityType: "ItNotfallplan", entityId: plan.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: plan },
      (tx) => tx.itNotfallplan.update({ where: { id: plan.id }, data: { letzterTestAm: new Date(datum) } })
    );

    res.status(201).json(created);
  })
);

export default router;
