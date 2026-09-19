import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

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

// Registered after the caller has uploaded the file directly to Supabase Storage — same
// out-of-band pattern as Contract.fileObjectKey (contracts.routes.ts): the file bytes never pass
// through this API, only the resulting storage path.
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
