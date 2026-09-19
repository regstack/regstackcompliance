import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { createDownloadUrl, createUploadUrl } from "./objectStorage";

const router = Router({ mergeParams: true });

const ALLOWED_CONTRACT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileMime: z.enum([...ALLOWED_CONTRACT_MIME_TYPES] as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_CONTRACT_FILE_SIZE_BYTES),
});

// Step 1 of the upload flow: mint a pre-signed PUT URL so the file's bytes go straight from the
// browser to object storage, never through this API (see the PUT / handler below, which
// registers the resulting objectKey once the browser's own upload has succeeded). fileSize is
// only a UX guard here — a pre-signed PUT URL doesn't itself enforce a size limit, so this is not
// the security boundary; it just avoids minting URLs the frontend has already refused to use.
router.post(
  "/upload-url",
  requirePermission("contract", "write"),
  asyncHandler(async (req, res) => {
    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
    });
    if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");

    const { uploadUrl, objectKey } = await createUploadUrl({
      institutionId: req.user!.institutionId,
      activityId: activity.id,
      fileName: parsed.data.fileName,
      fileMime: parsed.data.fileMime,
    });
    res.json({ uploadUrl, objectKey });
  })
);

router.get(
  "/download-url",
  requirePermission("contract", "read"),
  asyncHandler(async (req, res) => {
    const activity = await prisma.outsourcingActivity.findFirst({
      where: { id: req.params.activityId, institutionId: req.user!.institutionId },
      include: { contract: true },
    });
    if (!activity?.contract?.fileObjectKey) throw new NotFoundError("Kein Vertragsdokument hinterlegt");

    const downloadUrl = await createDownloadUrl(activity.contract.fileObjectKey);
    res.json({ downloadUrl });
  })
);

const clauseSchema = z.object({
  clauseChecklist: z.record(z.enum(["ERFUELLT", "NICHT_ERFUELLT", "IN_UEBERARBEITUNG"])).optional(),
  clauseJustifications: z.record(z.string()).optional(),
  subOutsourcingChecklist: z.record(z.any()).optional(),
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
            clauseJustifications: parsed.data.clauseJustifications ?? {},
            subOutsourcingChecklist: parsed.data.subOutsourcingChecklist,
            ...fileFields,
          },
          update: {
            clauseChecklist: parsed.data.clauseChecklist ?? undefined,
            clauseJustifications: parsed.data.clauseJustifications ?? undefined,
            subOutsourcingChecklist: parsed.data.subOutsourcingChecklist ?? undefined,
            ...fileFields,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
