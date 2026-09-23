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
  requirePermission("riskModelRecord", "read"),
  asyncHandler(async (req, res) => {
    const modelle = await prisma.rmModell.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(modelle);
  })
);

const createSchema = z.object({
  bezeichnung: z.string().min(1),
  verwendungszweck: z.string().min(1),
  komplexitaet: z.enum(["einfach", "komplex"]).default("einfach"),
  technologiegestuetzteInnovationOderKi: z.boolean().default(false),
  wesentlicheAnnahmen: z.string().nullable().optional(),
  datenqualitaetspruefung: z.string().nullable().optional(),
  ueberschreibungsregelung: z.string().nullable().optional(),
  erklaerbarkeitsbewertung: z.string().nullable().optional(),
  externerDienstleister: z.boolean().default(false),
  validierungUnabhaengig: z.boolean().default(false),
  initialvalidierungAm: z.string().datetime().nullable().optional(),
  letzteValidierungAm: z.string().datetime().nullable().optional(),
  naechsteValidierungFaellig: z.string().datetime().nullable().optional(),
  validierungsergebnis: z.string().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("riskModelRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { initialvalidierungAm, letzteValidierungAm, naechsteValidierungFaellig, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "RmModell", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmModell.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            initialvalidierungAm: initialvalidierungAm ? new Date(initialvalidierungAm) : undefined,
            letzteValidierungAm: letzteValidierungAm ? new Date(letzteValidierungAm) : undefined,
            naechsteValidierungFaellig: naechsteValidierungFaellig ? new Date(naechsteValidierungFaellig) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = createSchema.partial();

router.put(
  "/:id",
  requirePermission("riskModelRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmModell.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Modell nicht gefunden");

    const { initialvalidierungAm, letzteValidierungAm, naechsteValidierungFaellig, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "RmModell", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmModell.update({
          where: { id: before.id },
          data: {
            ...rest,
            initialvalidierungAm: initialvalidierungAm ? new Date(initialvalidierungAm) : undefined,
            letzteValidierungAm: letzteValidierungAm ? new Date(letzteValidierungAm) : undefined,
            naechsteValidierungFaellig: naechsteValidierungFaellig ? new Date(naechsteValidierungFaellig) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

// Folgevalidierung erfassen — AT 4.1 Tz. 9: mind. alle drei Jahre sowie anlassbezogen, für
// komplexe Modelle unabhängig von der Modellentwicklung (validierungUnabhaengig bleibt ein
// eigenes Feld, das der Fachbereich beim Anlegen/Bearbeiten setzt, nicht diese Route).
router.post(
  "/:id/validieren",
  requirePermission("riskModelRecord", "write"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      validierungsergebnis: z.string().min(1),
      naechsteValidierungFaellig: z.string().datetime().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmModell.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Modell nicht gefunden");

    const updated = await withAudit(
      { entityType: "RmModell", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmModell.update({
          where: { id: before.id },
          data: {
            letzteValidierungAm: new Date(),
            validierungsergebnis: parsed.data.validierungsergebnis,
            naechsteValidierungFaellig: parsed.data.naechsteValidierungFaellig ? new Date(parsed.data.naechsteValidierungFaellig) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
