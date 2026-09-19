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
  requirePermission("icsPolicy", "read"),
  asyncHandler(async (req, res) => {
    const businessProcessId = typeof req.query.businessProcessId === "string" ? req.query.businessProcessId : undefined;
    const controlId = typeof req.query.controlId === "string" ? req.query.controlId : undefined;
    const policies = await prisma.icsPolicyDocument.findMany({
      where: {
        institutionId: req.user!.institutionId,
        businessProcesses: businessProcessId ? { some: { businessProcessId } } : undefined,
        controls: controlId ? { some: { controlId } } : undefined,
      },
      include: { businessProcesses: { include: { businessProcess: true } }, controls: { include: { control: true } } },
      orderBy: { title: "asc" },
    });
    res.json(
      policies.map((p) => ({
        ...p,
        businessProcesses: p.businessProcesses.map((bp) => bp.businessProcess),
        controls: p.controls.map((c) => c.control),
      }))
    );
  })
);

router.get(
  "/:id",
  requirePermission("icsPolicy", "read"),
  asyncHandler(async (req, res) => {
    const policy = await prisma.icsPolicyDocument.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { businessProcesses: { include: { businessProcess: true } }, controls: { include: { control: true } } },
    });
    if (!policy) throw new NotFoundError("Dokument nicht gefunden");
    res.json({
      ...policy,
      businessProcesses: policy.businessProcesses.map((bp) => bp.businessProcess),
      controls: policy.controls.map((c) => c.control),
    });
  })
);

const policySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  documentType: z.string().optional(),
  fileObjectKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().optional(),
  fileMime: z.string().optional(),
  businessProcessIds: z.array(z.string()).default([]),
  controlIds: z.array(z.string()).default([]),
});

router.post(
  "/",
  requirePermission("icsPolicy", "write"),
  asyncHandler(async (req, res) => {
    const parsed = policySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const { businessProcessIds, controlIds, ...data } = parsed.data;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IcsPolicyDocument", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.icsPolicyDocument.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            uploadedByUserId: data.fileObjectKey ? req.user!.userId : undefined,
            uploadedAt: data.fileObjectKey ? new Date() : undefined,
            ...data,
            businessProcesses: { create: businessProcessIds.map((businessProcessId) => ({ businessProcessId })) },
            controls: { create: controlIds.map((controlId) => ({ controlId })) },
          },
          include: { businessProcesses: true, controls: true },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  requirePermission("icsPolicy", "write"),
  asyncHandler(async (req, res) => {
    const parsed = policySchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.icsPolicyDocument.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Dokument nicht gefunden");

    const { businessProcessIds, controlIds, ...data } = parsed.data;
    const updated = await withAudit(
      { entityType: "IcsPolicyDocument", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        if (businessProcessIds) await tx.icsPolicyProcess.deleteMany({ where: { policyDocumentId: before.id } });
        if (controlIds) await tx.icsPolicyControl.deleteMany({ where: { policyDocumentId: before.id } });
        return tx.icsPolicyDocument.update({
          where: { id: before.id },
          data: {
            ...data,
            uploadedByUserId: data.fileObjectKey ? req.user!.userId : undefined,
            uploadedAt: data.fileObjectKey ? new Date() : undefined,
            businessProcesses: businessProcessIds
              ? { create: businessProcessIds.map((businessProcessId) => ({ businessProcessId })) }
              : undefined,
            controls: controlIds ? { create: controlIds.map((controlId) => ({ controlId })) } : undefined,
          },
          include: { businessProcesses: true, controls: true },
        });
      }
    );
    res.json(updated);
  })
);

export default router;
