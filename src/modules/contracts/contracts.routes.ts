import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router({ mergeParams: true });

const clauseSchema = z.object({
  clauseChecklist: z.record(z.enum(["ERFUELLT", "NICHT_ERFORDERLICH", "OFFEN"])).optional(),
  subOutsourcingChecklist: z.record(z.unknown()).optional(),
  // Registered after the caller has uploaded the file directly to object storage (S3/Hetzner) via
  // a pre-signed URL obtained out-of-band — the file bytes never pass through this API.
  fileObjectKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().optional(),
  fileMime: z.string().optional(),
});

router.put(
  "/",
  requirePermission("contract", "write"),
  asyncHandler(async (req, res) => {
    const parsed = clauseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
      include: { contract: true },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    if (parsed.data.subOutsourcingChecklist && !activity.isSubOutsourcing) {
      throw new ValidationError("subOutsourcingChecklist ist nur bei isSubOutsourcing=true relevant (Tz. 8)");
    }

    const before = activity.contract as unknown as Record<string, unknown> | null;
    const fileFields =
      parsed.data.fileObjectKey !== undefined
        ? {
            fileObjectKey: parsed.data.fileObjectKey,
            fileName: parsed.data.fileName,
            fileSize: parsed.data.fileSize,
            fileMime: parsed.data.fileMime,
            uploadedAt: new Date(),
            uploadedByUserId: req.user!.userId,
          }
        : {};

    const updated = await withAudit(
      { entityType: "Contract", entityId: activity.id, action: before ? "UPDATE" : "CREATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.contract.upsert({
          where: { activityId: activity.id },
          create: {
            activityId: activity.id,
            clauseChecklist: parsed.data.clauseChecklist ?? {},
            subOutsourcingChecklist: parsed.data.subOutsourcingChecklist,
            ...fileFields,
          },
          update: {
            clauseChecklist: parsed.data.clauseChecklist ?? undefined,
            subOutsourcingChecklist: parsed.data.subOutsourcingChecklist ?? undefined,
            ...fileFields,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
