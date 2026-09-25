import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { collectRemovalIds } from "../weiterverlagerung/tree";

const router = Router({ mergeParams: true });

async function requireArrangement(arrangementId: string, institutionId: string) {
  const arrangement = await prisma.ictArrangement.findFirst({ where: { id: arrangementId, institutionId } });
  if (!arrangement) throw new NotFoundError("Vertragsverhältnis nicht gefunden");
  return arrangement;
}

// ITS-Ebene 6 — Weiterverlagerungskette eines IKT-Vertragsverhältnisses. Gleiche Baumstruktur wie
// Weiterverlagerung (AT 9), hier an IctArrangement statt OutsourcingActivity gehängt (siehe
// Kommentar im Schema). Ergänzt additiv zu hasSubcontracting/subcontractingNote.
router.get(
  "/",
  requirePermission("ictRegister", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const nodes = await prisma.ictSubcontracting.findMany({
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
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);

    let level = 1;
    if (parsed.data.parentId) {
      const parent = await prisma.ictSubcontracting.findFirst({
        where: { id: parsed.data.parentId, arrangementId: arrangement.id },
      });
      if (!parent) throw new NotFoundError("Übergeordneter Sub-Anbieter nicht gefunden");
      level = parent.level + 1;
    }

    const created = await withAudit(
      { entityType: "IctSubcontracting", entityId: arrangement.id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.ictSubcontracting.create({
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

// Soft-delete: sets status=ENTFERNT on the node and every descendant, walked server-side from the
// arrangement's own records — never from a client-supplied id list (same reasoning as
// Weiterverlagerung's identical endpoint).
router.post(
  "/:nodeId/remove",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const arrangement = await requireArrangement(req.params.arrangementId, req.user!.institutionId);
    const node = await prisma.ictSubcontracting.findFirst({ where: { id: req.params.nodeId, arrangementId: arrangement.id } });
    if (!node) throw new NotFoundError("Sub-Anbieter nicht gefunden");

    const all = await prisma.ictSubcontracting.findMany({ where: { arrangementId: arrangement.id } });
    const idsToRemove = collectRemovalIds(node.id, all);

    await withAudit(
      { entityType: "IctSubcontracting", entityId: node.id, action: "UPDATE", actor: req.user, ipAddress: req.ip },
      async (tx) => {
        const { count } = await tx.ictSubcontracting.updateMany({
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
