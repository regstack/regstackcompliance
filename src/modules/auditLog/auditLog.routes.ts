import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// Read-only by construction — there is deliberately no PUT/PATCH/DELETE route for audit_log_events
// anywhere in this codebase; the only writer is withAudit() inside the same transaction as the
// entity write it documents.
router.get(
  "/",
  requirePermission("auditLog", "read"),
  asyncHandler(async (req, res) => {
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const events = await prisma.auditLogEvent.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: "desc" },
      take: 200,
      include: { actor: { select: { name: true, role: true, email: true } } },
    });
    res.json(events);
  })
);

export default router;
