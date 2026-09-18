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
  requirePermission("complianceRecord", "read"),
  asyncHandler(async (req, res) => {
    const quellen = await prisma.quelle.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { bezeichnung: "asc" },
    });
    res.json(quellen);
  })
);

const quelleSchema = z.object({
  bezeichnung: z.string().min(1),
  bezugsweg: z.string().optional(),
  turnus: z.string().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  letzteDurchsicht: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = quelleSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Quelle", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.quelle.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            ...parsed.data,
            letzteDurchsicht: parsed.data.letzteDurchsicht ? new Date(parsed.data.letzteDurchsicht) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.put(
  "/:id",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = quelleSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.quelle.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Quelle nicht gefunden");

    const updated = await withAudit(
      { entityType: "Quelle", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.quelle.update({
          where: { id: before.id },
          data: { ...parsed.data, letzteDurchsicht: parsed.data.letzteDurchsicht ? new Date(parsed.data.letzteDurchsicht) : undefined },
        })
    );
    res.json(updated);
  })
);

export default router;
