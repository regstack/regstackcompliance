import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router({ mergeParams: true });

async function requireArrangement(arrangementId: string, institutionId: string) {
  const arrangement = await prisma.ictArrangement.findFirst({ where: { id: arrangementId, institutionId } });
  if (!arrangement) throw new NotFoundError("Vertragsverhältnis nicht gefunden");
  return arrangement;
}

// ITS-Ebene 4 (Durchführungsverordnung (EU) 2024/2956) — mehrere separate IKT-Dienstleistungen je
// Vertragsverhältnis, additiv zur Kurzbeschreibung in IctArrangement.functionDescription.
router.get(
  "/",
  requirePermission("ictRegister", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const services = await prisma.ictService.findMany({
      where: { arrangementId: req.params.arrangementId },
      orderBy: { createdAt: "asc" },
    });
    res.json(services);
  })
);

const createSchema = z.object({
  serviceDescription: z.string().min(1),
  serviceLevelObjective: z.string().optional(),
});

router.post(
  "/",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IctService", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.ictService.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            arrangementId: arrangement.id,
            ...parsed.data,
          },
        })
    );
    res.status(201).json(created);
  })
);

export default router;
