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
 * revision_personal — one row per person, upsert-only.
 * ===================================================================*/

router.get(
  "/",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionPersonal.findMany({ where: { institutionId: req.user!.institutionId } }));
  })
);

const personalSchema = z.object({
  userId: z.string().min(1),
  qualifikation: z.string().optional(),
  sollFortbildungTage: z.number().int().nullable().optional(),
  nonAuditTasks: z.string().optional(),
  advisoryActive: z.boolean().optional(),
  advisorySafeguard: z.string().optional(),
});

router.put(
  "/",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = personalSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    const { userId, ...rest } = parsed.data;

    const before = await prisma.revisionPersonal.findUnique({ where: { userId } });
    const updated = await withAudit(
      { entityType: "RevisionPersonal", entityId: userId, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionPersonal.upsert({
          where: { userId },
          create: { institutionId: req.user!.institutionId, userId, updatedByUserId: req.user!.userId, ...rest },
          update: { updatedByUserId: req.user!.userId, ...rest },
        })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * revision_schulungen — insert + delete, no update.
 * ===================================================================*/

router.get(
  "/schulungen",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionSchulung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { datum: "desc" } }));
  })
);

const schulungSchema = z.object({ userId: z.string().min(1), titel: z.string().min(1), datum: z.string().datetime(), umfang: z.number().int().nullable().optional(), nachweisText: z.string().optional() });

router.post(
  "/schulungen",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = schulungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionSchulung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionSchulung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data, datum: new Date(parsed.data.datum) },
        })
    );
    res.status(201).json(created);
  })
);

router.delete(
  "/schulungen/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.revisionSchulung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Schulung nicht gefunden");

    await withAudit(
      { entityType: "RevisionSchulung", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionSchulung.delete({ where: { id: before.id } })
    );
    res.status(204).end();
  })
);

/* =====================================================================
 * revision_sperrfristen — add + update, no delete.
 * ===================================================================*/

router.get(
  "/sperrfristen",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.revisionSperrfrist.findMany({ where: { institutionId: req.user!.institutionId } }));
  })
);

const sperrfristSchema = z.object({
  userId: z.string().nullable().optional(),
  name: z.string().optional(),
  fromUnit: z.string().optional(),
  transferDate: z.string().datetime().nullable().optional(),
  barredAreas: z.string().optional(),
  barEndDate: z.string().datetime().nullable().optional(),
  deviation: z.boolean().optional(),
  deviationReason: z.string().optional(),
});

router.post(
  "/sperrfristen",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = sperrfristSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["transferDate", "barEndDate"]);
    const created = await withAudit(
      { entityType: "RevisionSperrfrist", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.revisionSperrfrist.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/sperrfristen/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = sperrfristSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionSperrfrist.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Sperrfrist nicht gefunden");

    const data = toDates(parsed.data, ["transferDate", "barEndDate"]);
    const updated = await withAudit(
      { entityType: "RevisionSperrfrist", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionSperrfrist.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

/* =====================================================================
 * revision_sonderwissen — add + update, no delete.
 * ===================================================================*/

router.get(
  "/sonderwissen",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.revisionSonderwissen.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { pruefung: { select: { subject: true } } },
      })
    );
  })
);

const sonderwissenSchema = z.object({
  userId: z.string().nullable().optional(),
  name: z.string().optional(),
  fromUnit: z.string().optional(),
  topic: z.string().optional(),
  pruefungId: z.string().nullable().optional(),
  durationText: z.string().optional(),
});

router.post(
  "/sonderwissen",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = sonderwissenSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionSonderwissen", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.revisionSonderwissen.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data } })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/sonderwissen/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = sonderwissenSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionSonderwissen.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Sonderwissen-Eintrag nicht gefunden");

    const updated = await withAudit(
      { entityType: "RevisionSonderwissen", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionSonderwissen.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

export default router;
