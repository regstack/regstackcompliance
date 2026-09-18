import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
// Pure tree-walk helper — generic over {id, parentId}, so the exact same descendant-cascade logic
// used for Weiterverlagerung applies unchanged to a DORA sub-outsourcing chain.
import { collectRemovalIds } from "../weiterverlagerung/tree";

const router = Router({ mergeParams: true });

async function requireArrangement(arrangementId: string, institutionId: string) {
  const arrangement = await prisma.doraIctArrangement.findFirst({ where: { id: arrangementId, institutionId } });
  if (!arrangement) throw new NotFoundError("DORA-Arrangement nicht gefunden");
  return arrangement;
}

router.get(
  "/",
  requirePermission("doraRegister", "read"),
  asyncHandler(async (req, res) => {
    await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const nodes = await prisma.doraWeiterverlagerung.findMany({
      where: { arrangementId: req.params.arrangementId },
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
  requirePermission("doraRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);

    let level = 1;
    if (parsed.data.parentId) {
      const parent = await prisma.doraWeiterverlagerung.findFirst({
        where: { id: parsed.data.parentId, arrangementId: arrangement.id },
      });
      if (!parent) throw new NotFoundError("Übergeordneter Sub-Anbieter nicht gefunden");
      level = parent.level + 1;
    }

    const created = await withAudit(
      { entityType: "DoraWeiterverlagerung", entityId: arrangement.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.doraWeiterverlagerung.create({
          data: {
            arrangementId: arrangement.id,
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
  requirePermission("doraRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const node = await prisma.doraWeiterverlagerung.findFirst({ where: { id: req.params.nodeId, arrangementId: arrangement.id } });
    if (!node) throw new NotFoundError("Sub-Anbieter nicht gefunden");

    const updated = await withAudit(
      { entityType: "DoraWeiterverlagerung", entityId: node.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before: node },
      (tx) => tx.doraWeiterverlagerung.update({ where: { id: node.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

// Soft-delete: sets status=ENTFERNT on the node and every descendant, walked server-side from the
// arrangement's own records — never from a client-supplied id list.
router.post(
  "/:nodeId/remove",
  requirePermission("doraRegister", "write"),
  asyncHandler(async (req, res) => {
    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const node = await prisma.doraWeiterverlagerung.findFirst({ where: { id: req.params.nodeId, arrangementId: arrangement.id } });
    if (!node) throw new NotFoundError("Sub-Anbieter nicht gefunden");

    const all = await prisma.doraWeiterverlagerung.findMany({ where: { arrangementId: arrangement.id } });
    const idsToRemove = collectRemovalIds(node.id, all);

    await withAudit(
      { entityType: "DoraWeiterverlagerung", entityId: node.id, action: "UPDATE", actor: req.user, ipAddress: req.ip },
      async (tx) => {
        const { count } = await tx.doraWeiterverlagerung.updateMany({
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
