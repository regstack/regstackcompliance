import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { NotFoundError, ValidationError } from "../../utils/errors";

const router = Router();

const KATEGORIEN = [
  "ADRESSENAUSFALLRISIKO",
  "MARKTPREISRISIKO_HANDELSBUCH",
  "MARKTPREISRISIKO_ANLAGEBUCH",
  "LIQUIDITAETSRISIKO",
  "OPERATIONELLES_RISIKO",
  "KONZENTRATIONSRISIKO",
  "ESG_RISIKO",
  "SONSTIGES_RISIKO",
] as const;

const TYPEN = [
  "sensitivitaetsanalyse",
  "szenarioanalyse_historisch",
  "szenarioanalyse_hypothetisch",
  "schwerer_konjunktureller_abschwung",
  "inverser_stresstest",
  "resilienzanalyse",
] as const;

const EBENEN = ["gesamtinstitut", "risikoart", "portfolio", "geschaeftsbereich"] as const;

router.get(
  "/",
  requirePermission("riskStressTest", "read"),
  asyncHandler(async (req, res) => {
    const stresstests = await prisma.rmStresstest.findMany({
      where: { institutionId: req.user!.institutionId },
      orderBy: [{ jahr: "desc" }, { durchgefuehrtAm: "desc" }],
    });
    res.json(stresstests);
  })
);

const createSchema = z.object({
  jahr: z.number().int(),
  typ: z.enum(TYPEN),
  ebene: z.enum(EBENEN).default("gesamtinstitut"),
  betroffeneRisikoarten: z.array(z.enum(KATEGORIEN)).default([]),
  szenariobeschreibung: z.string().min(1),
  risikofaktoren: z.string().nullable().optional(),
  wechselwirkungenBeruecksichtigt: z.boolean().default(false),
  ergebnis: z.string().nullable().optional(),
  rtfBeruecksichtigt: z.boolean().default(false),
  handlungsbedarf: z.string().nullable().optional(),
  durchgefuehrtAm: z.string().datetime(),
  angemessenheitGeprueftAm: z.string().datetime().nullable().optional(),
  verantwortlichUserId: z.string().nullable().optional(),
});

router.post(
  "/",
  requirePermission("riskStressTest", "write"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const id = randomUUID();
    const { durchgefuehrtAm, angemessenheitGeprueftAm, ...rest } = parsed.data;
    const created = await withAudit(
      { entityType: "RmStresstest", entityId: id, action: "CREATE", actor: req.user, ipAddress: req.ip },
      (tx) =>
        tx.rmStresstest.create({
          data: {
            id,
            institutionId: req.user!.institutionId,
            createdByUserId: req.user!.userId,
            durchgefuehrtAm: new Date(durchgefuehrtAm),
            angemessenheitGeprueftAm: angemessenheitGeprueftAm ? new Date(angemessenheitGeprueftAm) : undefined,
            ...rest,
          },
        })
    );
    res.status(201).json(created);
  })
);

const updateSchema = createSchema.partial();

router.put(
  "/:id",
  requirePermission("riskStressTest", "write"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.rmStresstest.findFirst({ where: { id: req.params.id, institutionId: req.user!.institutionId } });
    if (!before) throw new NotFoundError("Stresstest nicht gefunden");

    const { durchgefuehrtAm, angemessenheitGeprueftAm, ...rest } = parsed.data;
    const updated = await withAudit(
      { entityType: "RmStresstest", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
      (tx) =>
        tx.rmStresstest.update({
          where: { id: before.id },
          data: {
            ...rest,
            durchgefuehrtAm: durchgefuehrtAm ? new Date(durchgefuehrtAm) : undefined,
            angemessenheitGeprueftAm: angemessenheitGeprueftAm ? new Date(angemessenheitGeprueftAm) : undefined,
          },
        })
    );
    res.json(updated);
  })
);

export default router;
