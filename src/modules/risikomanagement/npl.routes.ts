import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

// AT 4.2 Tz. 3 NPL-Strategie ist konditional (nur bei hohem Bestand notleidender
// Risikopositionen relevant) — dieses Register bleibt in Instituten ohne relevanten NPL-Bestand
// einfach leer, siehe Risikomanagement_BAIT_MVP_Spezifikation.md.
router.get(
  "/",
  requirePermission("riskManagementRecord", "read"),
  asyncHandler(async (req, res) => {
    const kennzahlen = await prisma.rmNplKennzahl.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: { periode: "desc" },
    });
    res.json(kennzahlen);
  })
);

const kennzahlSchema = z.object({
  periode: z.string().min(1),
  nplQuote: z.number().nullable().optional(),
  nplBestand: z.number().nullable().optional(),
  zielQuote: z.number().nullable().optional(),
  abbaupfadEingehalten: z.boolean().nullable().optional(),
  massnahmen: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = kennzahlSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RmNplKennzahl", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmNplKennzahl.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...parsed.data },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = kennzahlSchema.partial();

router.put(
  "/:id",
  requirePermission("riskManagementRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmNplKennzahl.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("NPL-Kennzahl nicht gefunden");

    const updated = await withAudit(
      { entityType: "RmNplKennzahl", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.rmNplKennzahl.update({ where: { id: before.id }, data: parsed.data })
    );
    res.json(updated);
  })
);

export default router;
