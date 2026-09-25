import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("icsControl", "read"),
  requireAccessGrant("IKS"),
  asyncHandler(async (req, res) => {
    const businessProcessId = typeof req.query.businessProcessId === "string" ? req.query.businessProcessId : undefined;
    const controls = await prisma.icsControl.findMany({
      where: {
        institutionId: req.user!.institutionId,
        businessProcesses: businessProcessId ? { some: { businessProcessId } } : undefined,
      },
      include: { businessProcesses: { include: { businessProcess: true } }, tests: true },
      orderBy: { name: "asc" },
    });
    res.json(
      controls.map((c) => ({
        ...c,
        businessProcesses: c.businessProcesses.map((bp) => bp.businessProcess),
        testCount: c.tests.length,
      }))
    );
  })
);

router.get(
  "/:id",
  requirePermission("icsControl", "read"),
  requireAccessGrant("IKS"),
  asyncHandler(async (req, res) => {
    const control = await prisma.icsControl.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: {
        businessProcesses: { include: { businessProcess: true } },
        policies: { include: { policyDocument: true } },
        tests: { include: { evidence: true }, orderBy: { plannedDate: "desc" } },
      },
    });
    if (!control) throw new NotFoundError("Kontrolle nicht gefunden");
    res.json({
      ...control,
      businessProcesses: control.businessProcesses.map((bp) => bp.businessProcess),
      policies: control.policies.map((p) => p.policyDocument),
    });
  })
);

const controlSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  controlType: z.enum(["ITGC", "AUTOMATED", "MANUAL"]),
  description: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY", "AD_HOC", "PER_TRANSACTION"]),
  controlOwnerUserId: z.string().nullable().optional(),
  risksAddressed: z.string().optional(),
  active: z.boolean().optional(),
  businessProcessIds: z.array(z.string()).default([]),
});

router.post(
  "/",
  requirePermission("icsControl", "write"),
  asyncHandler(async (req, res) => {
    const parsed = controlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const { businessProcessIds, ...data } = parsed.data;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IcsControl", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.icsControl.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            ...data,
            businessProcesses: { create: businessProcessIds.map((businessProcessId) => ({ businessProcessId })) },
          },
          include: { businessProcesses: true },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  requirePermission("icsControl", "write"),
  asyncHandler(async (req, res) => {
    const parsed = controlSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.icsControl.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Kontrolle nicht gefunden");

    const { businessProcessIds, ...data } = parsed.data;
    const updated = await withAudit(
      { entityType: "IcsControl", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      async (tx) => {
        if (businessProcessIds) {
          await tx.icsControlProcess.deleteMany({ where: { controlId: before.id } });
        }
        return tx.icsControl.update({
          where: { id: before.id },
          data: {
            ...data,
            businessProcesses: businessProcessIds
              ? { create: businessProcessIds.map((businessProcessId) => ({ businessProcessId })) }
              : undefined,
          },
          include: { businessProcesses: true },
        });
      }
    );
    res.json(updated);
  })
);

export default router;
