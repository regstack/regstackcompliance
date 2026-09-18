import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { ValidationError } from "../../utils/errors";

const router = Router();

const moduleSchema = z.enum(["OUTSOURCING", "COMPLIANCE", "INTERNAL_AUDIT"]);

// Generic evidence/document ledger shared across modules — read-only for now (no upload UI exists
// for any module yet), filterable by `?module=` and optionally `?entityType=&entityId=` (Interne
// Revision looks up files for one specific Arbeitspapier; Compliance only ever needed the module
// filter).
router.get(
  "/",
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

export default router;
