import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { collectRemovalIds } from "./tree";

const router = Router({ mergeParams: true });

async function requireActivity(activityId: string, institutionId: string) {
  const activity = await prisma.outsourcingActivity.findFirst({ where: { id: activityId, institutionId } });
  if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");
  return activity;
}

router.get(
  "/",
  requirePermission("weiterverlagerung", "read"),
  asyncHandler(async (req, res) => {
    await requireActivity(req.params.activityId, req.user!.institutionId);
    const nodes = await prisma.weiterverlagerung.findMany({
      where: { activityId: req.params.activityId },
      orderBy: { level: "asc" },
    });
    res.json(nodes);
  })
);

const createSchema = z.object({
  parentId: z.string().uuid().nullable(),
  provider: z.string().min(1),
  country: z.string().optional(),
  description: z.string().optional(),
});

router.post(
  "/",
  requirePermission("weiterverlagerung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await requireActivity(req.params.activityId, req.user!.institutionId);

    let level = 1;
    if (parsed.data.parentId) {
      const parent = await prisma.weiterverlagerung.findFirst({
        where: { id: parsed.data.parentId, activityId: activity.id },
      });
      if (!parent) throw new NotFoundError("Übergeordneter Sub-Anbieter nicht gefunden");
      level = parent.level + 1;
    }

    const created = await withAudit(
      { entityType: "Weiterverlagerung", entityId: activity.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.weiterverlagerung.create({
          data: {
            activityId: activity.id,
            parentId: parsed.data.parentId,
            level,
            provider: parsed.data.provider,
            country: parsed.data.country,
            description: parsed.data.description,
            createdByUserId: req.user!.userId,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = z.object({
  provider: z.string().min(1).optional(),
  country: z.string().optional(),
  description: z.string().optional(),
});

router.patch(
  "/:nodeId",
  requirePermission("weiterverlagerung", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await requireActivity(req.params.activityId, req.user!.institutionId);
    const node = await prisma.weiterverlagerung.findFirst({ where: { id: req.params.nodeId, activityId: activity.id } });
    if (!node) throw new NotFoundError("Sub-Anbieter nicht gefunden");

    const updated = await withAudit(
      { entityType: "Weiterverlagerung", entityId: node.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: node },
      (tx) => tx.weiterverlagerung.update({ where: { id: node.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

// Soft-delete: sets status=ENTFERNT on the node and every descendant, walked server-side from the
// activity's own records — never from a client-supplied id list.
router.post(
  "/:nodeId/remove",
  requirePermission("weiterverlagerung", "write"),
  asyncHandler(async (req, res) => {
    const activity = await requireActivity(req.params.activityId, req.user!.institutionId);
    const node = await prisma.weiterverlagerung.findFirst({ where: { id: req.params.nodeId, activityId: activity.id } });
    if (!node) throw new NotFoundError("Sub-Anbieter nicht gefunden");

    const all = await prisma.weiterverlagerung.findMany({ where: { activityId: activity.id } });
    const idsToRemove = collectRemovalIds(node.id, all);

    await withAudit(
      { entityType: "Weiterverlagerung", entityId: node.id, action: "UPDATE", actor: req.user, ipAddress: req.ip },
      async (tx) => {
        const { count } = await tx.weiterverlagerung.updateMany({
          where: { id: { in: idsToRemove } },
          data: { status: "ENTFERNT" },
        });
        return { removedIds: idsToRemove, count };
      }
    );
    res.status(204).end();
  })
);

export default router;
