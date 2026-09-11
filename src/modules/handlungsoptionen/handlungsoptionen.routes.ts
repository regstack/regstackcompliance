import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router({ mergeParams: true });

// Exactly the three legally meaningful values (Tz. 6 S. 3) — BCM_LINKED is a real, distinct
// option, not "unset". Enforced by the zod enum here as well as the Prisma enum in the schema,
// so an invalid fourth value cannot enter through either layer.
const schema = z.object({
  status: z.enum(["ADOPTED_OPTIONS", "EXIT_STRATEGY", "BCM_LINKED"]),
  strategyDescription: z.string().optional(),
  ersetzbarkeit: z.enum(["LEICHT", "SCHWIERIG", "UNMOEGLICH"]).optional(),
  transitionMonths: z.number().int().optional(),
  reviewDate: z.string().datetime().optional(),
  depControls: z.string().optional(),
});

router.put(
  "/",
  requirePermission("handlungsoption", "write"),
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
      include: { handlungsoption: true },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    const before = activity.handlungsoption as unknown as Record<string, unknown> | null;
    const data = {
      status: parsed.data.status,
      strategyDescription: parsed.data.strategyDescription,
      ersetzbarkeit: parsed.data.ersetzbarkeit,
      transitionMonths: parsed.data.transitionMonths,
      reviewDate: parsed.data.reviewDate ? new Date(parsed.data.reviewDate) : undefined,
      depControls: parsed.data.depControls,
    };

    const updated = await withAudit(
      { entityType: "HandlungsoptionRecord", entityId: activity.id, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.handlungsoptionRecord.upsert({
          where: { activityId: activity.id },
          create: { activityId: activity.id, ...data },
          update: data,
        })
    );
    res.json(updated);
  })
);

// Dependency-acceptance (BCM_LINKED path) requires a separate, Geschäftsleitung-only confirmation
// step — mirrors the prototype's "depApprover"/"depDate" fields, but here the role check is
// server-side (rbac.ts "handlungsoption.approve"), not just a disabled-looking form field.
const approveSchema = z.object({ depApprover: z.string().min(1) });

router.post(
  "/approve",
  requirePermission("handlungsoption.approve", "write"),
  asyncHandler(async (req, res) => {
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
      include: { handlungsoption: true },
    });
    if (!activity?.handlungsoption) throw new NotFoundError("Handlungsoption nicht gefunden");
    if (activity.handlungsoption.status !== "BCM_LINKED") {
      throw new ValidationError("Genehmigung nur im BCM_LINKED-Pfad vorgesehen (Tz. 6 S. 3)");
    }

    const before = activity.handlungsoption as unknown as Record<string, unknown>;
    const updated = await withAudit(
      { entityType: "HandlungsoptionRecord", entityId: activity.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.handlungsoptionRecord.update({
          where: { activityId: activity.id },
          data: { depApprover: parsed.data.depApprover, depDate: new Date() },
        })
    );
    res.json(updated);
  })
);

export default router;
