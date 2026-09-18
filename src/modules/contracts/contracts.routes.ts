import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { assertValidContractFile } from "./fileValidation";
import { buildObjectKey, createDownloadUrl, createUploadUrl, deleteObject, headObject } from "../../lib/objectStorage";

const router = Router({ mergeParams: true });

const clauseSchema = z.object({
  clauseChecklist: z.record(z.enum(["ERFUELLT", "NICHT_ERFUELLT", "IN_UEBERARBEITUNG"])).optional(),
  clauseJustifications: z.record(z.string()).optional(),
  subOutsourcingChecklist: z.record(z.any()).optional(),
  // Set after the caller has uploaded the file directly to object storage (S3/Hetzner) via the
  // pre-signed URL from POST /upload-url below — the file bytes never pass through this API.
  fileObjectKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().optional(),
  fileMime: z.string().optional(),
});

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileMime: z.string().min(1),
  fileSize: z.number().int().positive(),
});

async function loadActivity(activityId: string, institutionId: string) {
  const activity = await prisma.outsourcingActivity.findFirst({
    where: { id: activityId, institutionId },
    include: { contract: true },
  });
  if (!activity) throw new NotFoundError("Auslagerung nicht gefunden");
  return activity;
}

// Step 1 of the upload flow: validate the proposed file, mint an object key scoped to this
// institution/activity, and hand back a pre-signed PUT URL the client uploads directly to.
router.post(
  "/upload-url",
  requirePermission("contract", "write"),
  asyncHandler(async (req, res) => {
    const parsed = uploadRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    assertValidContractFile(parsed.data.fileMime, parsed.data.fileSize);

    const activity = await loadActivity(req.params.activityId, req.user!.institutionId);

    const objectKey = buildObjectKey(req.user!.institutionId, activity.id, parsed.data.fileName);
    const uploadUrl = await createUploadUrl(objectKey, parsed.data.fileMime);
    res.json({ uploadUrl, objectKey, expiresIn: 300 });
  })
);

// Step 3 of the upload flow (after the client PUTs the file and then confirms it via PUT / with
// the objectKey below): a pre-signed GET URL to read the stored file back.
router.get(
  "/download-url",
  requirePermission("contract", "read"),
  asyncHandler(async (req, res) => {
    const activity = await loadActivity(req.params.activityId, req.user!.institutionId);
    if (!activity.contract?.fileObjectKey) throw new NotFoundError("Kein Dokument hochgeladen");

    const downloadUrl = await createDownloadUrl(activity.contract.fileObjectKey, activity.contract.fileName);
    res.json({ downloadUrl, fileName: activity.contract.fileName, expiresIn: 300 });
  })
);

router.delete(
  "/file",
  requirePermission("contract", "write"),
  asyncHandler(async (req, res) => {
    const activity = await loadActivity(req.params.activityId, req.user!.institutionId);
    const objectKeyToDelete = activity.contract?.fileObjectKey;
    if (!activity.contract || !objectKeyToDelete) throw new NotFoundError("Kein Dokument hochgeladen");

    const before = activity.contract as unknown as Record<string, unknown>;
    const updated = await withAudit(
      { entityType: "Contract", entityId: activity.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.contract.update({
          where: { activityId: activity.id },
          data: {
            fileObjectKey: null,
            fileName: null,
            fileSize: null,
            fileMime: null,
            uploadedAt: null,
            uploadedByUserId: null,
          },
        })
    );

    await deleteObject(objectKeyToDelete).catch((err) =>
      req.log?.warn({ err, objectKeyToDelete }, "Objektspeicher: Löschen fehlgeschlagen")
    );
    res.json(updated);
  })
);

router.put(
  "/",
  requirePermission("contract", "write"),
  asyncHandler(async (req, res) => {
    const parsed = clauseSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const activity = await loadActivity(req.params.activityId, req.user!.institutionId);

    if (parsed.data.subOutsourcingChecklist && !activity.isSubOutsourcing) {
      throw new ValidationError("subOutsourcingChecklist ist nur bei isSubOutsourcing=true relevant (Tz. 8)");
    }

    const before = activity.contract as unknown as Record<string, unknown> | null;
    const previousObjectKey = activity.contract?.fileObjectKey ?? null;
    const isNewFile = parsed.data.fileObjectKey !== undefined && parsed.data.fileObjectKey !== previousObjectKey;

    if (isNewFile) {
      // The client only PROPOSES fileSize/fileMime here — confirm the bytes actually landed in
      // object storage (via the pre-signed PUT from /upload-url) and match the claimed size
      // before trusting the metadata. Without this check a client could record a fileObjectKey
      // for a file it never uploaded.
      const meta = await headObject(parsed.data.fileObjectKey!);
      if (!meta) throw new ValidationError("Datei wurde nicht im Objektspeicher gefunden — Upload fehlgeschlagen?");
      if (typeof parsed.data.fileSize === "number" && meta.size !== parsed.data.fileSize) {
        throw new ValidationError("Dateigröße stimmt nicht mit dem hochgeladenen Objekt überein");
      }
    }

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

    if (isNewFile && previousObjectKey) {
      await deleteObject(previousObjectKey).catch((err) =>
        req.log?.warn({ err, previousObjectKey }, "Objektspeicher: Löschen des alten Dokuments fehlgeschlagen")
      );
    }

    res.json(updated);
  })
);

export default router;
