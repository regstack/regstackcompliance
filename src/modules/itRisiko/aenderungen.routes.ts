import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("itOperationsRecord", "read"),
  requireAccessGrant("IT_RISIKO"),
  asyncHandler(async (req, res) => {
    const aenderungen = await prisma.itAenderung.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(aenderungen);
  })
);

const createSchema = z.object({
  assetId: z.string().nullable().optional(),
  bezeichnung: z.string().min(1),
  art: z.string().nullable().optional(),
  risikobewertung: z.string().nullable().optional(),
  rueckabwicklungsplan: z.string().nullable().optional(),
  geplantAm: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    if (parsed.data.assetId) {
      const asset = await prisma.itAsset.findFirst({ where: { id: parsed.data.assetId, institutionId: req.user!.institutionId } });
      if (!asset) throw new ValidationError("Referenziertes IT-Asset nicht gefunden");
    }

    const id = randomUUID();
    const { geplantAm, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "ItAenderung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.itAenderung.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            geplantAm: geplantAm ? new Date(geplantAm) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = createSchema.partial().extend({ testErgebnis: z.string().nullable().optional() });

router.put(
  "/:id",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.itAenderung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Änderung nicht gefunden");
    if (before.status === "umgesetzt") throw new ValidationError("Eine umgesetzte Änderung kann nicht mehr bearbeitet werden.");

    const { geplantAm, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "ItAenderung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itAenderung.update({
          where: { id: before.id },
          data: { ...rest, geplantAm: geplantAm ? new Date(geplantAm) : undefined },
        })
    );
    res.json(updated);
  })
);

// Genehmigung vor Produktivsetzung — Tz. 8.5.
router.post(
  "/:id/genehmigen",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itAenderung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Änderung nicht gefunden");
    if (before.status !== "beantragt") throw new ValidationError("Nur beantragte Änderungen können genehmigt werden.");

    const updated = await withAudit(
      { entityType: "ItAenderung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.itAenderung.update({
          where: { id: before.id },
          data: { status: "genehmigt", genehmigtVonUserId: req.user!.userId, genehmigtAm: new Date() },
        })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/umsetzen",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itAenderung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Änderung nicht gefunden");
    if (before.status !== "genehmigt") throw new ValidationError("Nur genehmigte Änderungen können umgesetzt werden.");

    const updated = await withAudit(
      { entityType: "ItAenderung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.itAenderung.update({ where: { id: before.id }, data: { status: "umgesetzt", umgesetztAm: new Date() } })
    );
    res.json(updated);
  })
);

router.post(
  "/:id/zurueckstellen",
  requirePermission("itOperationsRecord", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.itAenderung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Änderung nicht gefunden");
    if (before.status === "umgesetzt") throw new ValidationError("Eine umgesetzte Änderung kann nicht mehr zurückgestellt werden.");

    const updated = await withAudit(
      { entityType: "ItAenderung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.itAenderung.update({ where: { id: before.id }, data: { status: "zurueckgestellt" } })
    );
    res.json(updated);
  })
);

export default router;
