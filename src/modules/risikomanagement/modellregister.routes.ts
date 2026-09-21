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
  requirePermission("modelGovernanceRecord", "read"),
  asyncHandler(async (req, res) => {
    const modelle = await prisma.modellregister.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(modelle);
  })
);

export const modellSchema = z.object({
  bezeichnung: z.string().min(1),
  zweck: z.string().min(1),
  istKiBasiert: z.boolean().default(false),
  status: z.enum(["in_entwicklung", "aktiv", "ausser_betrieb"]).default("in_entwicklung"),
  verantwortlichUserId: z.string().nullable().optional(),
  letzteValidierung: z.string().datetime().nullable().optional(),
  naechsteValidierung: z.string().datetime().nullable().optional(),
  validierungsergebnis: z.string().nullable().optional(),
  erklaerbarkeitBewertung: z.string().nullable().optional(),
  ueberschreibungenBeschreibung: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("modelGovernanceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = modellSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { letzteValidierung, naechsteValidierung, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "Modellregister", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.modellregister.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            letzteValidierung: letzteValidierung ? new Date(letzteValidierung) : undefined,
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

    const before = await prisma.modellregister.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Modellregister-Eintrag nicht gefunden");

    const { letzteValidierung, naechsteValidierung, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "Modellregister", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.modellregister.update({
          where: { id: before.id },
          data: {
            ...rest,
            letzteValidierung: letzteValidierung ? new Date(letzteValidierung) : undefined,
            naechsteValidierung: naechsteValidierung ? new Date(naechsteValidierung) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
