import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { computeRisikoklasse, akzeptanzBegruendungMissing } from "./validation";

const router = Router();

router.get(
  "/",
  requirePermission("baitRisiko", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitRisikobewertung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { informationsverbund: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.get(
  "/for-verbund/:id",
  requirePermission("baitRisiko", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitRisikobewertung.findMany({
        where: { informationsverbundId: req.params.id, institutionId: req.user!.institutionId },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const risikostufe = z.enum(["niedrig", "mittel", "hoch", "sehr_hoch"]);

const baseSchema = z.object({
  informationsverbundId: z.string().uuid(),
  bedrohung: z.string().min(1),
  schwachstelle: z.string().optional(),
  eintrittswahrscheinlichkeit: risikostufe,
  auswirkung: risikostufe,
  behandlungsoption: z.enum(["vermeiden", "mindern", "akzeptieren", "transferieren"]).nullable().optional(),
  behandlungBegruendung: z.string().optional(),
  restrisiko: risikostufe.nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  bewertetAm: z.string().datetime().nullable().optional(),
  bewertetVonUserId: z.string().nullable().optional(),
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

    const verbund = await prisma.baitInformationsverbund.findFirst({
      where: { id: parsed.data.informationsverbundId, institutionId: req.user!.institutionId },
    });
    if (!verbund) throw new NotFoundError("Informationsverbund nicht gefunden");

    // Risikoklasse wird serverseitig aus den beiden Eingaben abgeleitet, nie vom Client übernommen.
    const risikoklasse = computeRisikoklasse(parsed.data.eintrittswahrscheinlichkeit, parsed.data.auswirkung);
    if (akzeptanzBegruendungMissing(parsed.data.behandlungsoption, risikoklasse, parsed.data.behandlungBegruendung)) {
      throw new ValidationError(
        "behandlungBegruendung ist Pflicht, sobald ein hohes oder sehr hohes Risiko akzeptiert wird."
      );
    }

    const id = randomUUID();
    const data = toDates(parsed.data, ["bewertetAm", "nextReviewDueAt"]);
    const created = await withAudit(
      { entityType: "BaitRisikobewertung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.baitRisikobewertung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data, risikoklasse },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = baseSchema.partial();

router.patch(
  "/:id",
  requirePermission("baitRisiko", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.baitRisikobewertung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Risikobewertung nicht gefunden");

    if (parsed.data.informationsverbundId) {
      const verbund = await prisma.baitInformationsverbund.findFirst({
        where: { id: parsed.data.informationsverbundId, institutionId: req.user!.institutionId },
      });
      if (!verbund) throw new NotFoundError("Informationsverbund nicht gefunden");
    }

    const eintrittswahrscheinlichkeit = parsed.data.eintrittswahrscheinlichkeit ?? before.eintrittswahrscheinlichkeit;
    const auswirkung = parsed.data.auswirkung ?? before.auswirkung;
    const risikoklasse = computeRisikoklasse(eintrittswahrscheinlichkeit, auswirkung);

    const behandlungsoption = parsed.data.behandlungsoption !== undefined ? parsed.data.behandlungsoption : before.behandlungsoption;
    const behandlungBegruendung =
      parsed.data.behandlungBegruendung !== undefined ? parsed.data.behandlungBegruendung : before.behandlungBegruendung;
    if (akzeptanzBegruendungMissing(behandlungsoption, risikoklasse, behandlungBegruendung)) {
      throw new ValidationError(
        "behandlungBegruendung ist Pflicht, sobald ein hohes oder sehr hohes Risiko akzeptiert wird."
      );
    }

    const data = toDates(parsed.data, ["bewertetAm", "nextReviewDueAt"]);
    const updated = await withAudit(
      { entityType: "BaitRisikobewertung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitRisikobewertung.update({ where: { id: before.id }, data: { ...data, risikoklasse } })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("baitRisiko", "delete"),
  asyncHandler(async (req, res) => {
    const before = await prisma.baitRisikobewertung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Risikobewertung nicht gefunden");

    await withAudit(
      { entityType: "BaitRisikobewertung", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitRisikobewertung.delete({ where: { id: before.id } })
    );
    res.status(204).end();
  })
);

export default router;
