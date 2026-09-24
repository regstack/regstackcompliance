import { Router } from "express";
import { z } from "zod";
import { AccountingDocumentType } from "@prisma/client";
import { requirePermission } from "../../middleware/rbac";
import { NotFoundError, ValidationError } from "../../utils/errors";
import {
  assertAccountingObjectKeyBelongsToInstitution,
  createAccountingDownloadUrl,
  createAccountingUploadUrl,
} from "./objectStorage";
import { getAccountingFile, registerAccountingFile } from "./fileAttachment";
import { asyncHandler } from "../../utils/asyncHandler";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileMime: z.enum([...ALLOWED_MIME_TYPES] as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});

const registerSchema = z.object({
  fileObjectKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileMime: z.string().min(1),
});

/**
 * Mounted at "/:id" inside each of the four Accounting document routers (balanceSheets,
 * incomeStatements, notes, managementReports) — provides the same three-step pre-signed-upload
 * flow as src/modules/contracts/contracts.routes.ts, just generic over documentType and how to
 * look up the parent document (tenant-scoped find, returning null if not found/foreign).
 */
export function createDocumentFileRoutes(
  documentType: AccountingDocumentType,
  findDocument: (id: string, institutionId: string) => Promise<{ id: string } | null>
) {
  const router = Router({ mergeParams: true });

  router.post(
    "/upload-url",
    requirePermission("accountingRecord", "write"),
    asyncHandler(async (req, res) => {
      const parsed = uploadUrlSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const doc = await findDocument(req.params.id, req.user!.institutionId);
      if (!doc) throw new NotFoundError("Dokument nicht gefunden");

      const { uploadUrl, objectKey } = await createAccountingUploadUrl({
        institutionId: req.user!.institutionId,
        documentType,
        documentId: doc.id,
        fileName: parsed.data.fileName,
        fileMime: parsed.data.fileMime,
      });
      res.json({ uploadUrl, objectKey });
    })
  );

  // Step 2: register the objectKey the browser's own PUT to that pre-signed URL just wrote to —
  // the file bytes themselves never pass through this API.
  router.post(
    "/file",
    requirePermission("accountingRecord", "write"),
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const doc = await findDocument(req.params.id, req.user!.institutionId);
      if (!doc) throw new NotFoundError("Dokument nicht gefunden");

      assertAccountingObjectKeyBelongsToInstitution(parsed.data.fileObjectKey, req.user!.institutionId);

      const file = await registerAccountingFile(documentType, doc.id, req.user!.institutionId, parsed.data, req.user!, req.ip);
      res.status(201).json(file);
    })
  );

  router.get(
    "/download-url",
    requirePermission("accountingRecord", "read"),
    asyncHandler(async (req, res) => {
      const doc = await findDocument(req.params.id, req.user!.institutionId);
      if (!doc) throw new NotFoundError("Dokument nicht gefunden");

      const file = await getAccountingFile(documentType, doc.id);
      if (!file) throw new NotFoundError("Kein Dokument hinterlegt");

      const downloadUrl = await createAccountingDownloadUrl(file.fileObjectKey);
      res.json({ downloadUrl });
    })
  );

  return router;
}
