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
  requirePermission("itAccessRecord", "read"),
  asyncHandler(async (req, res) => {
    const berechtigungen = await prisma.itBerechtigung.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(berechtigungen);
  })
);

const createSchema = z.object({
  assetId: z.string().nullable().optional(),
  benutzerBezeichnung: z.string().min(1),
  benutzerUserId: z.string().nullable().optional(),
  istTechnischerBenutzer: z.boolean().default(false),
  istPrivilegiert: z.boolean().default(false),
  berechtigungsart: z.string().min(1),
  needToKnowBegruendung: z.string().nullable().optional(),
  befristetBis: z.string().datetime().nullable().optional(),
  genehmigtVonUserId: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itAccessRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    if (parsed.data.assetId) {
      const asset = await prisma.itAsset.findFirst({ where: { id: parsed.data.assetId, institutionId: req.user!.institutionId } });
      if (!asset) throw new ValidationError("Referenziertes IT-Asset nicht gefunden");
    }

    const id = randomUUID();
    const { befristetBis, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItBerechtigung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itBerechtigung.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            befristetBis: befristetBis ? new Date(befristetBis) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

// Eine entzogene Berechtigung wird nicht per PUT wieder aktiviert — das läuft ausschließlich
// über eine neue Berechtigung, analog zum Muster bei ItRisiko ("akzeptiert_von_gl" ist final).
const updateSchema = createSchema.partial();

router.put(
  "/:id",
  requirePermission("itAccessRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itBerechtigung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Berechtigung nicht gefunden");
    if (before.status === "entzogen") throw new ValidationError("Eine entzogene Berechtigung kann nicht mehr bearbeitet werden.");

    const { befristetBis, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItBerechtigung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itBerechtigung.update({
          where: { id: before.id },
          data: { ...rest, befristetBis: befristetBis ? new Date(befristetBis) : undefined },
        })
    );
    res.json(updated);
  })
);

// Rezertifizierung — Tz. 6.5: die für Einrichtung/Änderung/Deaktivierung zuständigen
// Kontrollinstanzen bestätigen periodisch, dass die Berechtigung weiterhin benötigt wird.
const rezertifizierenSchema = z.object({ naechsteRezertifizierung: z.string().datetime().nullable().optional() });

router.post(
  "/:id/rezertifizieren",
  requirePermission("itAccessRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = rezertifizierenSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itBerechtigung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Berechtigung nicht gefunden");
    if (before.status === "entzogen") throw new ValidationError("Eine entzogene Berechtigung kann nicht rezertifiziert werden.");

    const updated = await withAudit(
      { entityType: "ItBerechtigung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itBerechtigung.update({
          where: { id: before.id },
          data: {
            letzteRezertifizierung: new Date(),
            naechsteRezertifizierung: parsed.data.naechsteRezertifizierung ? new Date(parsed.data.naechsteRezertifizierung) : undefined,
            rezertifiziertVonUserId: req.user!.userId,
          },
        })
    );
    res.json(updated);
  })
);

// Deaktivierung/Entzug — Tz. 6.4: unverzüglich bei Wegfall der Erforderlichkeit (z. B.
// fristlose Kündigung). Endzustand, siehe Sperre in PUT/rezertifizieren oben.
router.post(
  "/:id/entziehen",
  requirePermission("itAccessRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itBerechtigung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Berechtigung nicht gefunden");
    if (before.status === "entzogen") throw new ValidationError("Berechtigung bereits entzogen");

    const updated = await withAudit(
      { entityType: "ItBerechtigung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itBerechtigung.update({
          where: { id: before.id },
          data: { status: "entzogen", deaktiviertAm: new Date(), deaktiviertVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/deaktivieren",
  requirePermission("itAccessRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itBerechtigung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Berechtigung nicht gefunden");
    if (before.status !== "aktiv") throw new ValidationError("Nur aktive Berechtigungen können deaktiviert werden.");

    const updated = await withAudit(
      { entityType: "ItBerechtigung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itBerechtigung.update({
          where: { id: before.id },
          data: { status: "deaktiviert", deaktiviertAm: new Date(), deaktiviertVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
