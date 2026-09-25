import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

// Cross-Norm-Register (Feststellungs- und Maßnahmenregister) — all Feststellungen for the
// institution, not scoped to one norm.
router.get(
  "/",
  requirePermission("complianceRecord", "read"),
  requireAccessGrant("COMPLIANCE"),
  asyncHandler(async (req, res) => {
    const feststellungen = await prisma.feststellung.findMany({
      where: { institutionId: req.user!.institutionId },
      include: { norm: { select: { bezeichnung: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(feststellungen);
  })
);

router.get(
  "/for-norm/:normId",
  requirePermission("complianceRecord", "read"),
  requireAccessGrant("COMPLIANCE"),
  asyncHandler(async (req, res) => {
    const feststellungen = await prisma.feststellung.findMany({
      where: { normId: req.params.normId, institutionId: req.user!.institutionId },
      orderBy: { createdAt: "desc" },
    });
    res.json(feststellungen);
  })
);

const feststellungSchema = z.object({
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  schweregrad: z.enum(["gering", "mittel", "wesentlich"]).optional(),
  frist: z.string().datetime().nullable().optional(),
  massnahme: z.string().optional(),
  quelle: z.string().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
});

router.post(
  "/for-norm/:normId",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const norm = await prisma.norm.findFirst({ where: { id: req.params.normId, institutionId: req.user!.institutionId } });
    if (!norm) throw new NotFoundError("Regelung nicht gefunden");

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "Feststellung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.feststellung.create({
          data: {
            id,
            institutionId: norm.institutionId,
            normId: norm.id,
            createdByUserId: req.user!.userId,
            ...parsed.data,
            frist: parsed.data.frist ? new Date(parsed.data.frist) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

// One endpoint for every status transition — mirrors the outsourcing status-PATCH pattern from
// Phase 1 rather than four near-identical routes. Each transition is only valid from a specific
// prior status, enforced server-side (never trust the client's idea of "current status").
const statusSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("fachbereich_erledigt") }),
  z.object({ action: z.literal("wirksamkeit_bestaetigt") }),
  z.object({ action: z.literal("geschlossen") }),
  z.object({ action: z.literal("akzeptiertes_risiko"), ueberpruefung: z.string().datetime() }),
]);

const ALLOWED_FROM: Record<string, string[]> = {
  fachbereich_erledigt: ["offen"],
  wirksamkeit_bestaetigt: ["fachbereich_erledigt"],
  geschlossen: ["wirksamkeit_bestaetigt"],
  akzeptiertes_risiko: ["offen", "fachbereich_erledigt"],
};

router.patch(
  "/:id/status",
  requirePermission("complianceRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.feststellung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");
    if (!ALLOWED_FROM[parsed.data.action].includes(before.status)) {
      throw new ValidationError(`Übergang zu "${parsed.data.action}" ist aus Status "${before.status}" nicht zulässig.`);
    }

    const now = new Date();
    const data =
      parsed.data.action === "fachbereich_erledigt"
        ? { status: "fachbereich_erledigt" as const, fachbereichErledigtVon: req.user!.userId, fachbereichErledigtAm: now }
        : parsed.data.action === "wirksamkeit_bestaetigt"
          ? { status: "wirksamkeit_bestaetigt" as const, wirksamkeitBestaetigtVon: req.user!.userId, wirksamkeitBestaetigtAm: now }
          : parsed.data.action === "geschlossen"
            ? { status: "geschlossen" as const, geschlossenVon: req.user!.userId, geschlossenAm: now }
            : {
                status: "akzeptiertes_risiko" as const,
                akzeptiertesRisikoEntscheider: req.user!.userId,
                akzeptiertesRisikoUeberpruefung: new Date(parsed.data.ueberpruefung),
              };

    const updated = await withAudit(
      { entityType: "Feststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.feststellung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

export default router;
