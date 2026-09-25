import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const STATUS = ["offen", "in_bearbeitung", "akzeptiert_von_gl", "geschlossen"] as const;

router.get(
  "/",
  requirePermission("itRiskRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const risiken = await prisma.itRisiko.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(risiken);
  })
);

const risikoSchema = z.object({
  assetId: z.string().nullable().optional(),
  bedrohung: z.string().min(1),
  eintrittswahrscheinlichkeit: z.string().nullable().optional(),
  auswirkung: z.string().nullable().optional(),
  bruttorisiko: z.string().nullable().optional(),
  massnahme: z.string().nullable().optional(),
  restrisiko: z.string().nullable().optional(),
  status: z.enum(STATUS).optional(),
  verantwortlichUserId: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itRiskRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = risikoSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    if (parsed.data.assetId) {
      const asset = await prisma.itAsset.findFirst({ where: { id: parsed.data.assetId, institutionId: req.user!.institutionId } });
      if (!asset) throw new ValidationError("Referenziertes IT-Asset nicht gefunden");
    }

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ItRisiko", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itRisiko.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

// Ein akzeptiertes oder geschlossenes Risiko wird nicht per PUT wieder auf "offen" o. ä. gedreht —
// das läuft ausschließlich über /:id/accept (GL-Akzeptanz) bzw. bleibt sonst manuell im Status.
const updateSchema = risikoSchema.partial();

router.put(
  "/:id",
  requirePermission("itRiskRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itRisiko.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Risiko nicht gefunden");
    if (before.status === "akzeptiert_von_gl") {
      throw new ValidationError("Ein von der Geschäftsleitung akzeptiertes Risiko kann nicht mehr bearbeitet werden.");
    }

    const updated = await withAudit(
      { entityType: "ItRisiko", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.itRisiko.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

// Akzeptanz eines verbleibenden Restrisikos — BAIT Kap. 3, ausschließlich die Geschäftsleitung
// (rbac.ts "itRisk.accept"), analog zur Dependency-Acceptance im Auslagerungsmodul.
router.post(
  "/:id/accept",
  requirePermission("itRisk.accept", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itRisiko.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Risiko nicht gefunden");
    if (before.status === "akzeptiert_von_gl") throw new ValidationError("Restrisiko bereits akzeptiert");

    const updated = await withAudit(
      { entityType: "ItRisiko", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itRisiko.update({
          where: { id: before.id },
          data: { status: "akzeptiert_von_gl", akzeptiertVonUserId: req.user!.userId, akzeptiertAm: new Date() },
        })
    );
    res.json(updated);
  })
);

export default router;
