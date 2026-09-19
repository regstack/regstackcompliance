import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";
import { canReportMassnahmeErledigt } from "./ownership";

const router = Router();

// ---------------------------------------------------------------------------
// ExternePruefung — the annual external auditor's report, once received by the
// Geschäftsleitung and logged by Interne Revision. Its findings (below) are then
// distributed to the responsible Fachbereiche/Module for remediation.
// ---------------------------------------------------------------------------

router.get(
  "/",
  requirePermission("externalAuditRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.externePruefung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { feststellungen: true },
        orderBy: [{ jahr: "desc" }, { createdAt: "desc" }],
      })
    );
  })
);

router.get(
  "/:id",
  requirePermission("externalAuditRecord", "read"),
  asyncHandler(async (req, res) => {
    const pruefung = await prisma.externePruefung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { feststellungen: true },
    });
    if (!pruefung) throw new NotFoundError("Externe Prüfung nicht gefunden");
    res.json(pruefung);
  })
);

const pruefungSchema = z.object({
  pruefer: z.string().min(1),
  jahr: z.number().int(),
  berichtsdatum: z.string().datetime().nullable().optional(),
});

router.post(
  "/",
  requirePermission("externalAuditRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = pruefungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ExternePruefung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.externePruefung.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            pruefer: parsed.data.pruefer,
            jahr: parsed.data.jahr,
            berichtsdatum: parsed.data.berichtsdatum ? new Date(parsed.data.berichtsdatum) : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

// First-confirmer-wins ack, same as RevisionReport.acknowledge — the Geschäftsleitung is who the
// external auditor's report actually goes to, before Interne Revision distributes its findings.
router.post(
  "/:id/acknowledge",
  requirePermission("externalAuditRecord.acknowledge", "write"),
  asyncHandler(async (req, res) => {
    const before = await prisma.externePruefung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Externe Prüfung nicht gefunden");
    if (before.glKenntnisnahmeAt) return res.json(before);

    const updated = await withAudit(
      { entityType: "ExternePruefung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.externePruefung.update({
          where: { id: before.id },
          data: { glKenntnisnahmeByUserId: req.user!.userId, glKenntnisnahmeAt: new Date() },
        })
    );
    res.json(updated);
  })
);

// ---------------------------------------------------------------------------
// ExternePruefungFeststellung — individual findings, distributed to a Fachbereich/Modul.
// ---------------------------------------------------------------------------

router.get(
  "/feststellungen/all",
  requirePermission("externalAuditRecord", "read"),
  asyncHandler(async (req, res) => {
    const assignedToMe = req.query.assignedToMe === "true";
    const modul = typeof req.query.modul === "string" ? req.query.modul : undefined;
    res.json(
      await prisma.externePruefungFeststellung.findMany({
        where: {
          institutionId: req.user!.institutionId,
          ...(assignedToMe ? { verantwortlichUserId: req.user!.userId } : {}),
          ...(modul ? { modul: modul as "OUTSOURCING" | "COMPLIANCE" | "INTERNAL_AUDIT" } : {}),
        },
        include: { externePruefung: { select: { pruefer: true, jahr: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const feststellungSchema = z.object({
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  schweregrad: z.enum(["gering", "mittel", "wesentlich"]).optional(),
  frist: z.string().datetime().nullable().optional(),
  modul: z.enum(["OUTSOURCING", "COMPLIANCE", "INTERNAL_AUDIT"]).nullable().optional(),
  fachbereich: z.string().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
});

// Creating a finding under an ExternePruefung IS distributing it — the moment Interne Revision
// assigns it a Verantwortliche/r, verteiltAm/Von is stamped, same instant.
router.post(
  "/:id/feststellungen",
  requirePermission("externalAuditRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const pruefung = await prisma.externePruefung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!pruefung) throw new NotFoundError("Externe Prüfung nicht gefunden");

    const id = randomUUID();
    const created = await withAudit(
      { entityType: "ExternePruefungFeststellung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.externePruefungFeststellung.create({
          data: {
            id,
            institutionId: pruefung.institutionId,
            externePruefungId: pruefung.id,
            createdByUserId: req.user!.userId,
            titel: parsed.data.titel,
            beschreibung: parsed.data.beschreibung,
            schweregrad: parsed.data.schweregrad,
            frist: parsed.data.frist ? new Date(parsed.data.frist) : undefined,
            modul: parsed.data.modul ?? undefined,
            fachbereich: parsed.data.fachbereich,
            verantwortlichUserId: parsed.data.verantwortlichUserId,
            verteiltAm: parsed.data.verantwortlichUserId ? new Date() : undefined,
            verteiltVon: parsed.data.verantwortlichUserId ? req.user!.userId : undefined,
          },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/feststellungen/:id",
  requirePermission("externalAuditRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.externePruefungFeststellung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    // Assigning (or re-assigning) a Verantwortliche/r re-stamps the distribution, exactly like
    // the initial POST — this is how a finding gets (re-)distributed after the fact.
    const nowDistributing = parsed.data.verantwortlichUserId !== undefined && parsed.data.verantwortlichUserId !== before.verantwortlichUserId;

    const updated = await withAudit(
      { entityType: "ExternePruefungFeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.externePruefungFeststellung.update({
          where: { id: before.id },
          data: {
            ...parsed.data,
            frist: parsed.data.frist !== undefined ? (parsed.data.frist ? new Date(parsed.data.frist) : null) : undefined,
            ...(nowDistributing && parsed.data.verantwortlichUserId
              ? { verteiltAm: new Date(), verteiltVon: req.user!.userId }
              : {}),
          },
        })
    );
    res.json(updated);
  })
);

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

// "fachbereich_erledigt" is ownership-based (the finding's Verantwortliche/r, or Interne
// Revision/Admin) — same rationale as Revisionsfeststellung's massnahme_erledigt: the recipient
// department reports its own remediation regardless of its RBAC role. Every other transition
// stays gated to the module's write role (Interne Revision confirms effectiveness and closes).
router.patch(
  "/feststellungen/:id/status",
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.externePruefungFeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
    });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");
    if (!ALLOWED_FROM[parsed.data.action].includes(before.status)) {
      throw new ValidationError(`Übergang zu "${parsed.data.action}" ist aus Status "${before.status}" nicht zulässig.`);
    }

    const isWriteRole = req.user!.role === "INTERNE_REVISION" || req.user!.role === "ADMIN";
    if (parsed.data.action === "fachbereich_erledigt") {
      const isOwner = canReportMassnahmeErledigt(before.verantwortlichUserId, req.user!.userId);
      if (!isWriteRole && !isOwner) {
        throw new ForbiddenError("Nur die/der Verantwortliche oder die Interne Revision kann dies melden.");
      }
    } else if (!isWriteRole) {
      throw new ForbiddenError(`Rolle "${req.user!.role}" darf diesen Übergang nicht durchführen.`);
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
      { entityType: "ExternePruefungFeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.externePruefungFeststellung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

export default router;
