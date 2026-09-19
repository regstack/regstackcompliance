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
  requirePermission("baitPruefung", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitItPruefungsfeststellung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { pruefung: { select: { subject: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.get(
  "/for-pruefung/:id",
  requirePermission("baitPruefung", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.baitItPruefungsfeststellung.findMany({
        where: { pruefungId: req.params.id, institutionId: req.user!.institutionId },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const feststellungSchema = z.object({
  pruefungId: z.string().uuid(),
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  schweregrad: z.enum(["niedrig", "mittel", "hoch", "kritisch"]).optional(),
  frist: z.string().datetime().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  massnahme: z.string().optional(),
});

function toDates<T extends Record<string, unknown>>(data: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of keys) {
    const v = out[k as string];
    if (typeof v === "string") out[k as string] = new Date(v);
  }
  return out as T;
}

router.post(
  "/",
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const pruefung = await prisma.baitItPruefung.findFirst({
      where: { id: parsed.data.pruefungId, institutionId: req.user!.institutionId },
    });
    if (!pruefung) throw new NotFoundError("IT-Prüfung nicht gefunden");

    const id = randomUUID();
    const data = toDates(parsed.data, ["frist"]);
    const created = await withAudit(
      { entityType: "BaitItPruefungsfeststellung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.baitItPruefungsfeststellung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = feststellungSchema.omit({ pruefungId: true }).partial();

router.patch(
  "/:id",
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.baitItPruefungsfeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    const data = toDates(parsed.data, ["frist"]);
    const updated = await withAudit(
      { entityType: "BaitItPruefungsfeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitItPruefungsfeststellung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

const statusSchema = z.object({ status: z.enum(["offen", "in_bearbeitung", "geschlossen"]) });

router.patch(
  "/:id/status",
  requirePermission("baitPruefung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.baitItPruefungsfeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    const isClosing = parsed.data.status === "geschlossen";
    const updated = await withAudit(
      { entityType: "BaitItPruefungsfeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.baitItPruefungsfeststellung.update({
          where: { id: before.id },
          data: {
            status: parsed.data.status,
            geschlossenAm: isClosing ? new Date() : null,
            geschlossenVon: isClosing ? req.user!.userId : null,
          },
        })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("baitPruefung", "delete"),
  asyncHandler(async (req, res) => {
    const before = await prisma.baitItPruefungsfeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    await withAudit(
      { entityType: "BaitItPruefungsfeststellung", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.baitItPruefungsfeststellung.delete({ where: { id: before.id } })
    );
    res.status(204).end();
  })
);

export default router;
