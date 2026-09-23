import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import {
  assertNachweisKeyBelongsToInstitution,
  buildNachweisKey,
  createNachweisDownloadUrl,
  createNachweisUploadUrl,
} from "./objectStorage";

const router = Router();

const MODULES = ["OUTSOURCING", "COMPLIANCE", "INTERNAL_AUDIT", "RISK_MANAGEMENT", "IT_RISK"] as const;
const moduleSchema = z.enum(MODULES);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Generic evidence/document ledger shared across modules, filterable by `?module=` and optionally
// `?entityType=&entityId=` (Interne Revision looks up files for one specific Arbeitspapier;
// Compliance only ever needed the module filter).
router.get(
  "/",
  requirePermission("nachweis", "read"),
  asyncHandler(async (req, res) => {
    const moduleParam = req.query.module;
    const parsedModule = moduleParam ? moduleSchema.safeParse(moduleParam) : undefined;
    if (moduleParam && !parsedModule?.success) throw new ValidationError("Ungültiger module-Filter");
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;

    const nachweise = await prisma.nachweis.findMany({
      where: { institutionId: req.user!.institutionId, module: parsedModule?.data, entityType, entityId },
      orderBy: { uploadedAt: "desc" },
    });
    res.json(nachweise);
  })
);

// Step 1 of the upload flow (same pattern as contracts.routes.ts / icsPolicyDocuments.routes.ts):
// mint a pre-signed PUT URL with this institution's id embedded in the key server-side. The file's
// bytes go straight from the browser to object storage, never through this API.
const uploadUrlSchema = z.object({
  module: moduleSchema,
  fileName: z.string().min(1).max(255),
  fileMime: z.enum([...ALLOWED_MIME_TYPES] as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});

router.post(
  "/upload-url",
  requirePermission("nachweis", "write"),
  asyncHandler(async (req, res) => {
    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const objectKey = buildNachweisKey(req.user!.institutionId, parsed.data.module, parsed.data.fileName);
    const uploadUrl = await createNachweisUploadUrl(objectKey, parsed.data.fileMime);
    res.json({ uploadUrl, objectKey });
  })
);

// Step 2: register the file the browser already uploaded via the pre-signed URL above. Every
// Nachweis row created here is a first version (previousVersionId null) — see /:id/neue-version
// for replacing one.
const createSchema = z.object({
  module: moduleSchema,
  entityType: z.string().min(1),
  entityId: z.string().nullable().optional(),
  dateiname: z.string().min(1),
  fileObjectKey: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileMime: z.string().min(1),
  hash: z.string().nullable().optional(),
  aufbewahrungsfrist: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("nachweis", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    assertNachweisKeyBelongsToInstitution(parsed.data.fileObjectKey, req.user!.institutionId);

    const { fileObjectKey, ...rest } = parsed.data;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Nachweis", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.nachweis.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            fileRef: fileObjectKey,
            uploadedByUserId: req.user!.userId,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

// Neue Fassung statt stillen Überschreibens (siehe /compliance/nachweise-Hinweis "Unveränderlich,
// sobald verknüpft"): legt eine neue Zeile mit previousVersionId auf die alte Fassung an, die alte
// bleibt unverändert erhalten und über laterVersions auffindbar.
const neueVersionSchema = z.object({
  dateiname: z.string().min(1),
  fileObjectKey: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileMime: z.string().min(1),
  hash: z.string().nullable().optional(),
  aufbewahrungsfrist: z.string().nullable().optional(),
});

router.post(
  "/:id/neue-version",
  requirePermission("nachweis", "write"),
  asyncHandler(async (req, res) => {
    const parsed = neueVersionSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    assertNachweisKeyBelongsToInstitution(parsed.data.fileObjectKey, req.user!.institutionId);

    const previous = await prisma.nachweis.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!previous) throw new NotFoundError("Nachweis nicht gefunden");

    const { fileObjectKey, ...rest } = parsed.data;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Nachweis", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.nachweis.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            module: previous.module,
            entityType: previous.entityType,
            entityId: previous.entityId,
            previousVersionId: previous.id,
            fileRef: fileObjectKey,
            uploadedByUserId: req.user!.userId,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.get(
  "/:id/download-url",
  requirePermission("nachweis", "read"),
  asyncHandler(async (req, res) => {
    const nachweis = await prisma.nachweis.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!nachweis?.fileRef) throw new NotFoundError("Kein Dokument hinterlegt");

    const downloadUrl = await createNachweisDownloadUrl(nachweis.fileRef);
    res.json({ downloadUrl });
  })
);

export default router;
