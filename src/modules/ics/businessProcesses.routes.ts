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
  requirePermission("icsProcess", "read"),
  requireAccessGrant("IKS"),
  asyncHandler(async (req, res) => {
    const processes = await prisma.icsBusinessProcess.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { controls: { select: { controlId: true } } },
      orderBy: { name: "asc" },
    });
    res.json(processes.map((p) => ({ ...p, controlCount: p.controls.length })));
  })
);

// Drill-down target: a business process with the controls mapped to it (Control Testing summary
// is left to the frontend, which already fetches /ics/control-tests?controlId= per control).
router.get(
  "/:id",
  requirePermission("icsProcess", "read"),
  requireAccessGrant("IKS"),
  asyncHandler(async (req, res) => {
    const process = await prisma.icsBusinessProcess.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: {
        controls: { include: { control: true } },
        policies: { include: { policyDocument: true } },
      },
    });
    if (!process) throw new NotFoundError("Geschäftsprozess nicht gefunden");
    res.json({
      ...process,
      controls: process.controls.map((c) => c.control),
      policies: process.policies.map((p) => p.policyDocument),
    });
  })
);

const processSchema = z.object({
  name: z.string().min(1),
  owner: z.string().optional(),
  description: z.string().optional(),
});

router.post(
  "/",
  requirePermission("icsProcess", "write"),
  asyncHandler(async (req, res) => {
    const parsed = processSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IcsBusinessProcess", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.icsBusinessProcess.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  requirePermission("icsProcess", "write"),
  asyncHandler(async (req, res) => {
    const parsed = processSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.icsBusinessProcess.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Geschäftsprozess nicht gefunden");

    const updated = await withAudit(
      { entityType: "IcsBusinessProcess", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.icsBusinessProcess.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

export default router;
