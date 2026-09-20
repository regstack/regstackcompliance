import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { assertIcsKeyBelongsToInstitution, buildIcsEvidenceKey, createIcsUploadUrl } from "./objectStorage";

const router = Router();

const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);
const MAX_EVIDENCE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

router.get(
  "/",
  requirePermission("icsTesting", "read"),
  asyncHandler(async (req, res) => {
    const controlId = typeof req.query.controlId === "string" ? req.query.controlId : undefined;
    const tests = await prisma.icsControlTest.findMany({
      where: { control: { institutionId: req.user!.institutionId }, controlId },
      include: { evidence: true, control: { select: { name: true } } },
      orderBy: { plannedDate: "desc" },
    });
    res.json(tests);
  })
);

router.get(
  "/:id",
  requirePermission("icsTesting", "read"),
  asyncHandler(async (req, res) => {
    const test = await prisma.icsControlTest.findFirst({
      where: { id: req.params.id, control: { institutionId: req.user!.institutionId } },
      include: { evidence: true, control: true },
    });
    if (!test) throw new NotFoundError("Kontrolltest nicht gefunden");
    res.json(test);
  })
);

const testSchema = z.object({
  controlId: z.string().min(1),
  plannedPeriod: z.string().optional(),
  plannedDate: z.string().datetime().nullable().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]).optional(),
  result: z.enum(["EFFECTIVE", "DEFICIENT", "NOT_TESTED"]).nullable().optional(),
  resultNotes: z.string().optional(),
});

async function assertControlInInstitution(controlId: string, institutionId: string) {
  const control = await prisma.icsControl.findFirst({ where: { id: controlId, institutionId } });
  if (!control) throw new NotFoundError("Kontrolle nicht gefunden");
}

router.post(
  "/",
  requirePermission("icsTesting", "write"),
  asyncHandler(async (req, res) => {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);
    await assertControlInInstitution(parsed.data.controlId, req.user!.institutionId);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IcsControlTest", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.icsControlTest.create({
          data: {
            id,
            createdByUserId: req.user!.userId,
            controlId: parsed.data.controlId,
            plannedPeriod: parsed.data.plannedPeriod,
            plannedDate: parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : undefined,
            status: parsed.data.status,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = testSchema.omit({ controlId: true }).partial();

router.patch(
  "/:id",
  requirePermission("icsTesting", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.icsControlTest.findFirst({ where: { id: req.params.id, control: { institutionId: req.user!.institutionId } } });
    if (!before) throw new NotFoundError("Kontrolltest nicht gefunden");

    const resultFields =
      parsed.data.status === "COMPLETED" && before.status !== "COMPLETED"
        ? { testedByUserId: req.user!.userId, testedAt: new Date() }
        : {};

    const updated = await withAudit(
      { entityType: "IcsControlTest", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.icsControlTest.update({
          where: { id: before.id },
          data: {
            plannedPeriod: parsed.data.plannedPeriod,
            plannedDate: parsed.data.plannedDate === undefined ? undefined : parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : null,
            status: parsed.data.status,
            result: parsed.data.result,
            resultNotes: parsed.data.resultNotes,
            ...resultFields,
          },
        })
    );
    res.json(updated);
  })
);

// Step 1 of the upload flow (same pattern as contracts.routes.ts): mint a pre-signed PUT URL so
// the file's bytes go straight from the browser to object storage, embedding this institution's id
// in the key server-side -- the client never chooses or supplies the key's institution segment.
const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileMime: z.enum([...ALLOWED_EVIDENCE_MIME_TYPES] as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_EVIDENCE_FILE_SIZE_BYTES),
});

router.post(
  "/:id/evidence/upload-url",
  requirePermission("icsTesting", "write"),
  asyncHandler(async (req, res) => {
    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const test = await prisma.icsControlTest.findFirst({ where: { id: req.params.id, control: { institutionId: req.user!.institutionId } } });
    if (!test) throw new NotFoundError("Kontrolltest nicht gefunden");

    const objectKey = buildIcsEvidenceKey(req.user!.institutionId, test.id, parsed.data.fileName);
    const uploadUrl = await createIcsUploadUrl(objectKey, parsed.data.fileMime);
    res.json({ uploadUrl, objectKey });
  })
);

// Step 2: registered after the caller has uploaded the file directly to object storage via the
// pre-signed URL above -- the file bytes never pass through this API.
const evidenceSchema = z.object({
  fileObjectKey: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().optional(),
  fileMime: z.string().optional(),
});

router.post(
  "/:id/evidence",
  requirePermission("icsTesting", "write"),
  asyncHandler(async (req, res) => {
    const parsed = evidenceSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const test = await prisma.icsControlTest.findFirst({ where: { id: req.params.id, control: { institutionId: req.user!.institutionId } } });
    if (!test) throw new NotFoundError("Kontrolltest nicht gefunden");

    // The client only ever legitimately echoes back a key this server itself minted above --
    // reject anything else before it's stored and later signed into a download URL.
    assertIcsKeyBelongsToInstitution(parsed.data.fileObjectKey, req.user!.institutionId);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IcsControlTestEvidence", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.icsControlTestEvidence.create({
          data: { id, testId: test.id, uploadedByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

export default router;
