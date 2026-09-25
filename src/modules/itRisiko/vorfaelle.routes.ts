import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const SCHWEREGRAD = ["gering", "mittel", "hoch", "kritisch"] as const;
const STATUS = ["offen", "in_bearbeitung", "geschlossen"] as const;

router.get(
  "/",
  requirePermission("itSecurityIncident", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const vorfaelle = await prisma.itSicherheitsvorfall.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { datum: "desc" },
    });
    res.json(vorfaelle);
  })
);

const createSchema = z.object({
  datum: z.string().datetime(),
  kategorie: z.string().nullable().optional(),
  schweregrad: z.enum(SCHWEREGRAD),
  beschreibung: z.string().min(1),
  betroffeneSysteme: z.string().nullable().optional(),
  eskalationAnUserId: z.string().nullable().optional(),
  meldepflichtBaFin: z.boolean().default(false),
  meldedatumBaFin: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itSecurityIncident", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { datum, meldedatumBaFin, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItSicherheitsvorfall", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itSicherheitsvorfall.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            datum: new Date(datum),
            meldedatumBaFin: meldedatumBaFin ? new Date(meldedatumBaFin) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  kategorie: z.string().nullable().optional(),
  schweregrad: z.enum(SCHWEREGRAD).optional(),
  beschreibung: z.string().min(1).optional(),
  betroffeneSysteme: z.string().nullable().optional(),
  eskalationAnUserId: z.string().nullable().optional(),
  meldepflichtBaFin: z.boolean().optional(),
  meldedatumBaFin: z.string().datetime().nullable().optional(),
  massnahme: z.string().nullable().optional(),
  status: z.enum(STATUS).optional(),
});

router.put(
  "/:id",
  requirePermission("itSecurityIncident", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itSicherheitsvorfall.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Sicherheitsvorfall nicht gefunden");

    const { meldedatumBaFin, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItSicherheitsvorfall", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itSicherheitsvorfall.update({
          where: { id: before.id },
          data: { ...rest, meldedatumBaFin: meldedatumBaFin ? new Date(meldedatumBaFin) : undefined },
        })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/abschliessen",
  requirePermission("itSecurityIncident", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itSicherheitsvorfall.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Sicherheitsvorfall nicht gefunden");
    if (before.status === "geschlossen") throw new ValidationError("Vorfall bereits abgeschlossen");

    const updated = await withAudit(
      { entityType: "ItSicherheitsvorfall", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itSicherheitsvorfall.update({
          where: { id: before.id },
          data: { status: "geschlossen", abschlussAm: new Date(), abschlussVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
