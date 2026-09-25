import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, hasPermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors";
import { canReportMassnahmeErledigt } from "./ownership";

const router = Router();

router.get(
  "/",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.revisionsfeststellung.findMany({
        where: { institutionId: req.user!.institutionId },
        include: {
          pruefungsobjekt: { select: { bezeichnung: true, verantwortlichUserId: true } },
          pruefung: { select: { subject: true } },
          fristverlaengerungen: true,
        },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.get(
  "/for-pruefungsobjekt/:id",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.revisionsfeststellung.findMany({
        where: { pruefungsobjektId: req.params.id, institutionId: req.user!.institutionId },
        include: { fristverlaengerungen: true },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.get(
  "/for-pruefung/:id",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.revisionsfeststellung.findMany({
        where: { pruefungId: req.params.id, institutionId: req.user!.institutionId },
        include: { fristverlaengerungen: true },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const feststellungSchema = z.object({
  pruefungsobjektId: z.string().nullable().optional(),
  pruefungId: z.string().nullable().optional(),
  titel: z.string().min(1),
  beschreibung: z.string().optional(),
  schweregrad: z.enum(["besonders_schwerwiegend", "schwerwiegend", "wesentlich", "geringfuegig"]).optional(),
  verantwortlichUserId: z.string().nullable().optional(),
  fristUrspruenglich: z.string().datetime().nullable().optional(),
  executiveTarget: z.boolean().optional(),
  nachschauNeeded: z.boolean().optional(),
  nachschauDate: z.string().datetime().nullable().optional(),
  stellungnahme: z.record(z.any()).optional(),
  // Draft abschluss (Tz. 11 Nachweis/Bestätigung) — saved without closing; the final close (with
  // abschlussArt) goes through PATCH .../status instead.
  abschluss: z.record(z.any()).optional(),
  execEscalation: z.record(z.any()).optional(),
  escalation: z.record(z.any()).optional(),
});

function toDates<T extends Record<string, unknown>>(data: T, keys: (keyof T)[]): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of keys) {
    const v = out[k as string];
    if (typeof v === "string") out[k as string] = new Date(v);
  }
  return out as T;
}

router.post(
  "/",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    // A Feststellung created from within a Prüfung always inherits that Prüfung's
    // Prüfungsobjekt — derived here, never trusted from the client, so a finding can never point
    // at a mismatched object.
    let pruefungsobjektId = parsed.data.pruefungsobjektId;
    if (parsed.data.pruefungId) {
      const pruefung = await prisma.pruefung.findFirst({
        where: { id: parsed.data.pruefungId, institutionId: req.user!.institutionId },
        select: { pruefungsobjektId: true },
      });
      if (!pruefung) throw new NotFoundError("Prüfung nicht gefunden");
      pruefungsobjektId = pruefung.pruefungsobjektId;
    }

    const id = randomUUID();
    const data = toDates(parsed.data, ["fristUrspruenglich", "nachschauDate"]);
    const created = await withAudit(
      { entityType: "Revisionsfeststellung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionsfeststellung.create({
          data: { id, institutionId: req.user!.institutionId, createdByUserId: req.user!.userId, ...data, pruefungsobjektId },
        })
    );
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = feststellungSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionsfeststellung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    const data = toDates(parsed.data, ["fristUrspruenglich", "nachschauDate"]);
    const updated = await withAudit(
      { entityType: "Revisionsfeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) => tx.revisionsfeststellung.update({ where: { id: before.id }, data })
    );
    res.json(updated);
  })
);

const statusSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("massnahme_erledigt") }),
  z.object({
    action: z.literal("geschlossen"),
    abschlussArt: z.enum(["erledigt", "restrisiko"]),
    abschluss: z.record(z.any()).optional(),
  }),
]);

// "Maßnahme erledigt" is ownership-based, not role-based: the Supabase-era "Fachbereich" role
// check was a proxy for "the person responsible for this finding's Prüfungsobjekt" (its own RLS
// comment said as much) — this implements that directly instead, matching the
// canRespondToHandshake precedent from the Compliance migration.
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.revisionsfeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { pruefungsobjekt: { select: { verantwortlichUserId: true } } },
    });
    if (!before) throw new NotFoundError("Feststellung nicht gefunden");

    if (parsed.data.action === "massnahme_erledigt") {
      if (before.status !== "offen") throw new ValidationError("Nur offene Feststellungen können als erledigt gemeldet werden.");
      const isWriteRole = hasPermission(req.user!.role, "revisionRecord", "write");
      const isOwner = canReportMassnahmeErledigt(before.pruefungsobjekt?.verantwortlichUserId, req.user!.userId);
      if (!isWriteRole && !isOwner) {
        throw new ForbiddenError("Nur die/der Verantwortliche des Prüfungsobjekts oder die Interne Revision kann dies melden.");
      }
      const updated = await withAudit(
        { entityType: "Revisionsfeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
        (tx) =>
          tx.revisionsfeststellung.update({
            where: { id: before.id },
            data: { status: "massnahme_erledigt", massnahmeErledigtVon: req.user!.userId, massnahmeErledigtAm: new Date() },
          })
      );
      return res.json(updated);
    }

    // geschlossen — Interne Revision confirms effectiveness; a separate, deliberate step from
    // the Fachbereich's "erledigt" report, never the same action. Same write-role gate as every
    // other revisionRecord mutation (not ownership-based, unlike the branch above).
    if (!hasPermission(req.user!.role, "revisionRecord", "write")) {
      throw new ForbiddenError(`Rolle "${req.user!.role}" darf eine Feststellung nicht schließen.`);
    }
    if (before.status === "geschlossen") throw new ValidationError("Feststellung ist bereits geschlossen.");
    // Destructured into plain locals before the closure below — TS discriminated-union narrowing
    // of `parsed.data` doesn't persist into a nested callback.
    const { abschlussArt, abschluss } = parsed.data;
    const updated = await withAudit(
      { entityType: "Revisionsfeststellung", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.revisionsfeststellung.update({
          where: { id: before.id },
          data: {
            status: "geschlossen",
            abschlussArt,
            abschluss,
            geschlossenVon: req.user!.userId,
            geschlossenAm: new Date(),
          },
        })
    );
    res.json(updated);
  })
);

router.get(
  "/:id/fristverlaengerung",
  requirePermission("revisionRecord", "read"),
  asyncHandler(async (req, res) => {
    const feststellung = await prisma.revisionsfeststellung.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!feststellung) throw new NotFoundError("Feststellung nicht gefunden");
    res.json(
      await prisma.revisionFristverlaengerung.findMany({ where: { feststellungId: feststellung.id }, orderBy: { datum: "asc" } })
    );
  })
);

const fristSchema = z.object({ neu: z.string().datetime(), antragsteller: z.string().optional(), genehmiger: z.string().optional(), begruendung: z.string().optional() });

// Append-only — the originally-agreed Frist is never overwritten (see schema comment).
router.post(
  "/:id/fristverlaengerung",
  requirePermission("revisionRecord", "write"),
  asyncHandler(async (req, res) => {
    const parsed = fristSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const feststellung = await prisma.revisionsfeststellung.findFirst({
      where: { id: req.params.id, institutionId: req.user!.institutionId },
      include: { fristverlaengerungen: { orderBy: { datum: "desc" }, take: 1 } },
    });
    if (!feststellung) throw new NotFoundError("Feststellung nicht gefunden");

    const alt = feststellung.fristverlaengerungen[0]?.neu ?? feststellung.fristUrspruenglich;
    const id = randomUUID();
    const created = await withAudit(
      { entityType: "RevisionFristverlaengerung", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.revisionFristverlaengerung.create({
          data: { id, feststellungId: feststellung.id, alt, neu: new Date(parsed.data.neu), antragsteller: parsed.data.antragsteller, genehmiger: parsed.data.genehmiger, begruendung: parsed.data.begruendung, createdByUserId: req.user!.userId },
        })
    );
    res.status(201).json(created);
  })
);

export default router;
