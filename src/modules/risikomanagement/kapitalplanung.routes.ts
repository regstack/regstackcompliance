import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("riskCapitalPlanning", "read"),
  asyncHandler(async (req, res) => {
    const planungen = await prisma.rmKapitalplanung.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { jahr: "desc" },
    });
    res.json(planungen);
  })
);

const createSchema = z.object({
  jahr: z.number().int(),
  planungshorizontJahre: z.number().int().positive(),
  kapitalbedarfPlanung: z.record(z.any()).default({}),
  verfuegbaresKapitalPlanung: z.record(z.any()).default({}),
  adverseSzenarienBeruecksichtigt: z.boolean().default(false),
  konsistenzGeschaeftsplanung: z.string().nullable().optional(),
});

// Neue Kapitalplanungen starten immer unverabschiedet — die Verabschiedung ist ein eigener,
// Geschäftsleitung-exklusiver Schritt (siehe /:id/verabschieden), niemals ein Client-Feld hier,
// analog zur Risikostrategie (AT 4.2).
router.post(
  "/",
  requirePermission("riskCapitalPlanning", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RmKapitalplanung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmKapitalplanung.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            ...parsed.data,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = createSchema.partial().extend({
  anlassbezogenAktualisiertAm: z.string().datetime().nullable().optional(),
});

router.put(
  "/:id",
  requirePermission("riskCapitalPlanning", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmKapitalplanung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Kapitalplanung nicht gefunden");
    if (before.verabschiedetAm) throw new ValidationError("Verabschiedete Kapitalplanungen können nicht mehr bearbeitet werden.");

    const { anlassbezogenAktualisiertAm, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "RmKapitalplanung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmKapitalplanung.update({
          where: { id: before.id },
          data: { ...rest, anlassbezogenAktualisiertAm: anlassbezogenAktualisiertAm ? new Date(anlassbezogenAktualisiertAm) : undefined },
        })
    );
    res.json(updated);
  })
);

// Verabschiedung durch die Geschäftsleitung — AT 4.1 Tz. 10, serverseitig durch die
// "riskCapitalPlanning.approve"-RBAC-Zeile erzwungen, nicht nur durch ein Frontend-Formular.
router.post(
  "/:id/verabschieden",
  requirePermission("riskCapitalPlanning.approve", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.rmKapitalplanung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Kapitalplanung nicht gefunden");
    if (before.verabschiedetAm) throw new ForbiddenError("Kapitalplanung bereits verabschiedet");

    const updated = await withAudit(
      { entityType: "RmKapitalplanung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmKapitalplanung.update({
          where: { id: before.id },
          data: { verabschiedetAm: new Date(), verabschiedetVonUserId: req.user!.userId },
        })
    );
    res.json(updated);
  })
);

export default router;
