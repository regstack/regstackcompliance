import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const KATEGORIEN = ["anwendung", "it_system", "netzwerk", "rechenzentrum", "sonstige"] as const;
const SCHUTZBEDARF = ["normal", "hoch", "sehr_hoch"] as const;

router.get(
  "/",
  requirePermission("itRiskRecord", "read"),
  asyncHandler(async (req, res) => {
    const assets = await prisma.itAsset.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(assets);
  })
);

const assetSchema = z.object({
  bezeichnung: z.string().min(1),
  kategorie: z.enum(KATEGORIEN),
  eigentuemerUserId: z.string().nullable().optional(),
  schutzbedarfVertraulichkeit: z.enum(SCHUTZBEDARF).nullable().optional(),
  schutzbedarfIntegritaet: z.enum(SCHUTZBEDARF).nullable().optional(),
  schutzbedarfVerfuegbarkeit: z.enum(SCHUTZBEDARF).nullable().optional(),
  begruendung: z.string().nullable().optional(),
  letzteUeberpruefung: z.string().datetime().nullable().optional(),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itRiskRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = assetSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { letzteUeberpruefung, naechsteUeberpruefung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItAsset", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itAsset.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            letzteUeberpruefung: letzteUeberpruefung ? new Date(letzteUeberpruefung) : undefined,
            naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = assetSchema.partial();

router.put(
  "/:id",
  requirePermission("itRiskRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itAsset.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("IT-Asset nicht gefunden");

    const { letzteUeberpruefung, naechsteUeberpruefung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItAsset", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itAsset.update({
          where: { id: before.id },
          data: {
            ...rest,
            letzteUeberpruefung: letzteUeberpruefung ? new Date(letzteUeberpruefung) : undefined,
            naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
