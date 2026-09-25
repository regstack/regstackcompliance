import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission, requireAccessGrant } from "../../middleware/rbac";

// Read-only reference registers — no write UI exists in the frontend today (see Phase 2 plan),
// so these are GET-only. Every route shares the same "complianceReference" read permission.
const router = Router();
router.use(requirePermission("complianceReference", "read"));
router.use(requireAccessGrant("COMPLIANCE"));

router.get(
  "/risiken",
  asyncHandler(async (req, res) => {
    res.json(await prisma.risiko.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { nr: "asc" } }));
  })
);

router.get(
  "/kontrollen",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.kontrolle.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { norm: { select: { bezeichnung: true } } },
        orderBy: { naechsteFaelligkeit: "asc" },
      })
    );
  })
);

router.get(
  "/norm-risiken",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.normRisiko.findMany({
        where: { norm: { institutionId: req.user!.institutionId } },
        include: { norm: { select: { bezeichnung: true } }, risiko: { select: { nr: true, bezeichnung: true } } },
      })
    );
  })
);

router.get(
  "/risiko-kontrollen",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.risikoKontrolle.findMany({
        where: { risiko: { institutionId: req.user!.institutionId } },
      })
    );
  })
);

router.get(
  "/beratung",
  asyncHandler(async (req, res) => {
    res.json(await prisma.beratungSchulung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { datum: "desc" } }));
  })
);

router.get(
  "/beauftragte",
  asyncHandler(async (req, res) => {
    res.json(await prisma.beauftragtenfunktion.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { bestelltAm: "asc" } }));
  })
);

router.get(
  "/funktionswechsel",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.funktionswechsel.findMany({
        where: { institutionId: req.user!.institutionId },
        include: { funktion: { select: { funktion: true } } },
        orderBy: { datum: "desc" },
      })
    );
  })
);

router.get(
  "/erleichterungen",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.erleichterung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { ueberpruefung: "asc" } })
    );
  })
);

router.get(
  "/stellenbeschreibungen",
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.stellenbeschreibung.findMany({
        where: { institutionId: req.user!.institutionId },
        orderBy: { naechsteUeberpruefung: "asc" },
      })
    );
  })
);

router.get(
  "/gremien",
  asyncHandler(async (req, res) => {
    res.json(await prisma.gremienZulieferung.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { typ: "asc" } }));
  })
);

router.get(
  "/ereignisse",
  asyncHandler(async (req, res) => {
    res.json(await prisma.ereignis.findMany({ where: { institutionId: req.user!.institutionId }, orderBy: { datum: "desc" } }));
  })
);

export default router;
