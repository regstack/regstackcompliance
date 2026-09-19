import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

async function requireVerbund(id: string, institutionId: string) {
  const verbund = await prisma.baitInformationsverbund.findFirst({ where: { id, institutionId } });
  if (!verbund) throw new NotFoundError("Informationsverbund nicht gefunden");
  return verbund;
}

router.get(
  "/",
  requirePermission("baitRisiko", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitInformationsverbund.findMany({
        where: { institutionId: req.user!.institutionId },
        orderBy: { createdAt: "asc" },
      })
    );
  })
);

const schutzbedarf = z.enum(["normal", "hoch", "sehr_hoch"]);

const baseSchema = z.object({
  name: z.string().min(1),
  beschreibung: z.string().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  schutzbedarfVertraulichkeit: schutzbedarf.optional(),
  schutzbedarfIntegritaet: schutzbedarf.optional(),
  schutzbedarfVerfuegbarkeit: schutzbedarf.optional(),
  schutzbedarfAuthentizitaet: schutzbedarf.optional(),
  schutzbedarfBegruendung: z.string().optional(),
  klassifiziertAm: z.string().datetime().nullable().optional(),
  klassifiziertVonUserId: z.string().nullable().optional(),
  nextReviewDueAt: z.string().datetime().nullable().optional(),
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
  requirePermission("baitRisiko", "write"),
  asyncHandler(async (req, res) => {
    const parsed = baseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const data = toDates(parsed.data, ["klassifiziertAm", "nextReviewDueAt"]);
    const created = await withAudit(
      { entityType: "BaitInformationsverbund", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.baitInformationsverbund.create({ data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data } })
    );
    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  requirePermission("baitRisiko", "read"),
  asyncHandler(async (req, res) => {
    const verbund = await prisma.baitInformationsverbund.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { risikobewertungen: true, pruefungen: { select: { id: true, subject: true, status: true } } },
    });
    if (!verbund) throw new NotFoundError("Informationsverbund nicht gefunden");
    res.json(verbund);
  })
);

const updateSchema = baseSchema.partial();

router.patch(
  "/:id",
  requirePermission("baitRisiko", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await requireVerbund(req.params.id, req.user!.institutionId);
    const data = toDates(parsed.data, ["klassifiziertAm", "nextReviewDueAt"]);
    const updated = await withAudit(
      { entityType: "BaitInformationsverbund", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitInformationsverbund.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("baitRisiko", "delete"),
  asyncHandler(async (req, res) => {
    const before = await requireVerbund(req.params.id, req.user!.institutionId);

    await withAudit(
      { entityType: "BaitInformationsverbund", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        // Risikobewertungen und IT-Prüfungen hängen per FK am Informationsverbund — Prüfungen
        // referenzieren ihn nur optional, also erst entkoppeln statt löschen, dann Risikobewertungen
        // und den Verbund selbst löschen, alles in derselben Transaktion wie der Audit-Eintrag.
        await tx.baitItPruefung.updateMany({ where: { informationsverbundId: before.id }, data: { informationsverbundId: null } });
        await tx.baitRisikobewertung.deleteMany({ where: { informationsverbundId: before.id } });
        return tx.baitInformationsverbund.delete({ where: { id: before.id } });
      }
    );
    res.status(204).end();
  })
);

export default router;
