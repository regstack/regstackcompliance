import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const KATEGORIEN = [
  "ADRESSENAUSFALLRISIKO",
  "MARKTPREISRISIKO_HANDELSBUCH",
  "MARKTPREISRISIKO_ANLAGEBUCH",
  "LIQUIDITAETSRISIKO",
  "OPERATIONELLES_RISIKO",
  "KONZENTRATIONSRISIKO",
  "ESG_RISIKO",
  "SONSTIGES_RISIKO",
] as const;

router.get(
  "/",
  requirePermission("riskManagementRecord", "read"),
  asyncHandler(async (req, res) => {
    const inventur = await prisma.risikoinventur.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: [{ jahr: "desc" }, { kategorie: "asc" }],
    });
    res.json(inventur);
  })
);

const inventurSchema = z.object({
  jahr: z.number().int(),
  kategorie: z.enum(KATEGORIEN),
  bezeichnung: z.string().min(1),
  wesentlichkeit: z.enum(["wesentlich", "nicht_wesentlich"]),
  begruendung: z.string().nullable().optional(),
  methodik: z.string().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  letzteUeberpruefung: z.string().datetime().nullable().optional(),
  naechsteUeberpruefung: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = inventurSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { letzteUeberpruefung, naechsteUeberpruefung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "Risikoinventur", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.risikoinventur.create({
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

const updateSchema = inventurSchema.partial();

router.put(
  "/:id",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.risikoinventur.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Risikoinventur-Eintrag nicht gefunden");

    const { letzteUeberpruefung, naechsteUeberpruefung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "Risikoinventur", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.risikoinventur.update({
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
