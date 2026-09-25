import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const ERKLAERBARKEIT = ["hoch", "mittel", "gering"] as const;
const VALIDIERUNG_ERGEBNIS = ["bestaetigt", "rekalibrierung_erforderlich", "ausser_betrieb_genommen"] as const;

router.get(
  "/",
  requirePermission("modelGovernanceRecord", "read"),
  requireAccessGrant("RISIKOMANAGEMENT"),
  asyncHandler(async (req, res) => {
    const modelle = await prisma.rmModell.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { validierungen: { orderBy: { durchgefuehrtAm: "desc" } } },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(modelle);
  })
);

const modellSchema = z.object({
  bezeichnung: z.string().min(1),
  zweck: z.string().nullable().optional(),
  enthaeltKiMlKomponente: z.boolean().default(false),
  erklaerbarkeit: z.enum(ERKLAERBARKEIT).nullable().optional(),
  ueberschreibungenVorhanden: z.boolean().default(false),
  ueberschreibungenBegruendung: z.string().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  naechsteValidierung: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("modelGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = modellSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    if (parsed.data.ueberschreibungenVorhanden && !parsed.data.ueberschreibungenBegruendung) {
      throw new ValidationError("Bei vorhandenen Überschreibungen ist eine Begründung erforderlich.");
    }

    const id = randomUUID();
    const { naechsteValidierung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "RmModell", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmModell.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            naechsteValidierung: naechsteValidierung ? new Date(naechsteValidierung) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = modellSchema.partial();

router.put(
  "/:id",
  requirePermission("modelGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmModell.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Modell nicht gefunden");
    if (before.status === "ausser_betrieb") throw new ValidationError("Außer Betrieb genommene Modelle können nicht mehr bearbeitet werden.");

    const { naechsteValidierung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "RmModell", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmModell.update({
          where: { id: before.id },
          data: { ...rest, naechsteValidierung: naechsteValidierung ? new Date(naechsteValidierung) : undefined },
        })
    );
    res.json(updated);
  })
);

const validierungSchema = z.object({
  durchgefuehrtAm: z.string().datetime(),
  ergebnis: z.enum(VALIDIERUNG_ERGEBNIS),
  kommentar: z.string().nullable().optional(),
});

// Ergebnis "ausser_betrieb_genommen" setzt das Modell im selben Aufruf mit außer Betrieb — zwei
// eigenständige withAudit-Aufrufe, analog zu Berechtigung/rezertifizieren (Kap. 5).
router.post(
  "/:id/validieren",
  requirePermission("modelGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = validierungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const modell = await prisma.rmModell.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!modell) throw new NotFoundError("Modell nicht gefunden");
    if (modell.status === "ausser_betrieb") throw new ValidationError("Außer Betrieb genommene Modelle können nicht mehr validiert werden.");

    const validierungId = randomUUID();
    const validierung = await withAudit(
      { entityType: "RmModellValidierung", entityId: validierungId, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmModellValidierung.create({
          data: {
            id: validierungId,
            modellId: modell.id,
            durchgefuehrtAm: new Date(parsed.data.durchgefuehrtAm),
            durchgefuehrtVonUserId: req.user!.userId,
            ergebnis: parsed.data.ergebnis,
            kommentar: parsed.data.kommentar,
          },
        })
    );

    if (parsed.data.ergebnis === "ausser_betrieb_genommen") {
      await withAudit(
        { entityType: "RmModell", entityId: modell.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: modell },
        (tx) => tx.rmModell.update({ where: { id: modell.id }, data: { status: "ausser_betrieb" } })
      );
    }

    res.status(201).json(validierung);
  })
);

export default router;
