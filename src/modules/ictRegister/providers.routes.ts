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
  requirePermission("ictRegister", "read"),
  asyncHandler(async (req, res) => {
    const providers = await prisma.ictProvider.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { name: "asc" },
    });
    res.json(providers);
  })
);

const providerSchema = z.object({
  name: z.string().min(1),
  legalEntityIdentifier: z.string().optional(),
  country: z.string().optional(),
  providerType: z.enum(["DIREKT", "KONZERNINTERN"]).optional(),
  parentUndertaking: z.string().optional(),
});

router.post(
  "/",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IctProvider", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) => tx.ictProvider.create({ data: { id, institutionId: req.user!.institutionId, ...parsed.data } })
    );
    res.status(201).json(created);
  })
);

router.put(
  "/:id",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.ictProvider.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Anbieter nicht gefunden");

    const updated = await withAudit(
      { entityType: "IctProvider", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.ictProvider.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

router.delete(
  "/:id",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.ictProvider.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { _count: { select: { arrangements: true } } },
    });
    if (!before) throw new NotFoundError("Anbieter nicht gefunden");
    if (before._count.arrangements > 0) {
      throw new ValidationError("Anbieter hat verknüpfte Vertragsverhältnisse — diese zuerst entfernen oder umhängen");
    }

    await withAudit(
      { entityType: "IctProvider", entityId: before.id, action: "DELETE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.ictProvider.delete({ where: { id: before.id } })
    );
    res.status(204).send();
  })
);

export default router;
