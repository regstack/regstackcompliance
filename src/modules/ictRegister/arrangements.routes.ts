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
  requirePermission("ictRegister", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const arrangements = await prisma.ictArrangement.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { provider: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(arrangements);
  })
);

export const arrangementSchema = z
  .object({
    providerId: z.string().min(1),
    functionDescription: z.string().min(1),
    supportsCriticalFunction: z.boolean().optional(),
    criticalityReason: z.string().optional(),
    contractStart: z.string().datetime().optional(),
    contractEnd: z.string().datetime().optional(),
    terminationNoticeMonths: z.number().int().optional(),
    annualCostEur: z.number().optional(),
    exitStrategyNote: z.string().optional(),
    dataCategories: z.string().optional(),
    hasSubcontracting: z.boolean().optional(),
    subcontractingNote: z.string().optional(),
    status: z.enum(["AKTIV", "BEENDET"]).optional(),
  })
  // Art. 28(3) — ein als kritisch/wichtig markiertes IKT-Vertragsverhältnis braucht eine
  // nachvollziehbare Begründung, sonst ist das Flag eine reine Behauptung ohne Substanz (gleiche
  // Logik wie scopeJustification bei OutsourcingActivity).
  .refine((data) => !data.supportsCriticalFunction || !!data.criticalityReason, {
    message: "criticalityReason ist Pflicht, sobald supportsCriticalFunction=true gesetzt ist (Art. 28 Abs. 3)",
    path: ["criticalityReason"],
  });

router.post(
  "/",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = arrangementSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const provider = await prisma.ictProvider.findFirst({
      where: { id: parsed.data.providerId, institutionId: req.user!.institutionId },
    });
    if (!provider) throw new NotFoundError("Anbieter nicht gefunden");

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "IctArrangement", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.ictArrangement.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            ...parsed.data,
            contractStart: parsed.data.contractStart ? new Date(parsed.data.contractStart) : undefined,
            contractEnd: parsed.data.contractEnd ? new Date(parsed.data.contractEnd) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.put(
  "/:id",
  requirePermission("ictRegister", "write"),
  asyncHandler(async (req, res) => {
    const parsed = arrangementSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.ictArrangement.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Vertragsverhältnis nicht gefunden");

    if (parsed.data.providerId !== before.providerId) {
      const provider = await prisma.ictProvider.findFirst({
        where: { id: parsed.data.providerId, institutionId: req.user!.institutionId },
      });
      if (!provider) throw new NotFoundError("Anbieter nicht gefunden");
    }

    const updated = await withAudit(
      { entityType: "IctArrangement", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.ictArrangement.update({
          where: { id: before.id },
          data: {
            ...parsed.data,
            contractStart: parsed.data.contractStart ? new Date(parsed.data.contractStart) : undefined,
            contractEnd: parsed.data.contractEnd ? new Date(parsed.data.contractEnd) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

// Interner Arbeits-Export (CSV) — KEIN geprüfter Abgleich mit den offiziellen EBA/ESA-Meldevorlagen
// (Durchführungsverordnung (EU) 2024/2956); dient als Arbeitsgrundlage für Wirtschaftsprüfung/
// Aufsicht, nicht als direkt einreichbares Meldeformat.
router.get(
  "/export",
  requirePermission("ictRegister", "read"),
  requireAccessGrant("OUTSOURCING"),
  asyncHandler(async (req, res) => {
    const arrangements = await prisma.ictArrangement.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { provider: true },
      orderBy: { createdAt: "asc" },
    });

    const header = [
      "Anbieter",
      "LEI",
      "Land",
      "Anbietertyp",
      "Funktion",
      "Kritisch/Wichtig",
      "Begründung Kritikalität",
      "Vertragsbeginn",
      "Vertragsende",
      "Kündigungsfrist (Monate)",
      "Jahreskosten (EUR)",
      "Exit-Strategie",
      "Weiterverlagerung",
      "Status",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = arrangements.map((a) =>
      [
        a.provider.name,
        a.provider.legalEntityIdentifier,
        a.provider.country,
        a.provider.providerType,
        a.functionDescription,
        a.supportsCriticalFunction ? "Ja" : "Nein",
        a.criticalityReason,
        a.contractStart?.toISOString().slice(0, 10),
        a.contractEnd?.toISOString().slice(0, 10),
        a.terminationNoticeMonths,
        a.annualCostEur,
        a.exitStrategyNote,
        a.hasSubcontracting ? "Ja" : "Nein",
        a.status,
      ]
        .map(escape)
        .join(",")
    );

    const csv = [header.map(escape).join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="dora-ict-register.csv"');
    res.send(csv);
  })
);

export default router;
