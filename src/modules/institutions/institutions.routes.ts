import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

router.get(
  "/me",
  requirePermission("institution", "read"),
  asyncHandler(async (req, res) => {
    const inst = await prisma.institutionProfile.findUnique({ where: { id: req.user!.institutionId } });
    if (!inst) throw new NotFoundError("Institut nicht gefunden");
    res.json(inst);
  })
);

const updateSchema = z.object({
  sizeClass: z.enum(["SEHR_KLEIN", "KLEIN", "MITTEL", "GROSS"]).optional(),
  groupRelief: z.boolean().optional(),
  reviewCycleYears: z.number().int().min(1).max(3).optional(),
  calculationModel: z.enum(["CSC", "TESLA"]).optional(),
  cscMaterialityThreshold: z.number().min(1).max(5).optional(),
  cscImpactThreshold: z.number().min(1).max(5).optional(),
  teslaLogicAnd: z.boolean().optional(),
  teslaThreshold: z.number().min(1).max(5).optional(),
  revisionsbeauftragterName: z.string().nullable().optional(),
  revisionsbeauftragterIstGeschaeftsleiter: z.boolean().optional(),
});

// Tz. 10 — Aufgabenwahrnehmung der Internen Revision durch einen Geschäftsleiter ist nur bei sehr
// kleinen Instituten zulässig; unabhängig davon, ob sizeClass in derselben Anfrage mitgeändert wird.
function assertRevisionsbeauftragterErlaubt(effectiveSizeClass: string, wantsGeschaeftsleiter: boolean | undefined) {
  if (wantsGeschaeftsleiter && effectiveSizeClass !== "SEHR_KLEIN") {
    throw new ValidationError(
      "Revisionsbeauftragter = Geschäftsleiter ist nur bei sehr kleinen Instituten zulässig (Tz. 10)."
    );
  }
}

// Prüfungsturnus (reviewCycleYears) ist von der Institutsgröße abgeleitet, aber überschreibbar
// (Kommentar am Feld in schema.prisma) — bislang war diese Ableitung nirgends implementiert. Wird
// reviewCycleYears nicht explizit mitgegeben, aber sizeClass geändert, wird der Turnus neu abgeleitet.
const DEFAULT_REVIEW_CYCLE_YEARS: Record<string, number> = {
  SEHR_KLEIN: 3,
  KLEIN: 3,
  MITTEL: 2,
  GROSS: 1,
};

// Governance settings (calculation model, group relief, Revisionsbeauftragter) — Geschäftsleitung/
// Admin only (rbac.ts), and every change is audited so a later dispute over "which model applied
// when" is answerable from audit_log_events, not from memory.
router.patch(
  "/me",
  requirePermission("institution", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.institutionProfile.findUnique({ where: { id: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Institut nicht gefunden");

    const effectiveSizeClass = parsed.data.sizeClass ?? before.sizeClass;
    assertRevisionsbeauftragterErlaubt(
      effectiveSizeClass,
      parsed.data.revisionsbeauftragterIstGeschaeftsleiter ?? before.revisionsbeauftragterIstGeschaeftsleiter
    );

    const data = { ...parsed.data };
    if (parsed.data.sizeClass && parsed.data.reviewCycleYears === undefined) {
      data.reviewCycleYears = DEFAULT_REVIEW_CYCLE_YEARS[parsed.data.sizeClass];
    }

    const updated = await withAudit(
      { entityType: "InstitutionProfile", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.institutionProfile.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

export default router;
