import { Router } from "express";
import { z } from "zod";
import { AccessModule, Role } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";
import { withAudit } from "../../middleware/auditTrail";
import { ValidationError } from "../../utils/errors";

const router = Router();

// Wer ein Modul freigeben/entziehen darf, ist an den jeweiligen Fachbereich gebunden — daher hier
// inline geprüft statt über die generische MATRIX (siehe rbac.ts moduleAccessGrant-Kommentar),
// analog zum gl-mitteilungen/sonderauftraege-Muster in revisions/governance.routes.ts.
const APPROVER_ROLES: Record<AccessModule, Role[]> = {
  OUTSOURCING: ["AUSLAGERUNGSBEAUFTRAGTER", "GESCHAEFTSLEITUNG", "ADMIN"],
  COMPLIANCE: ["COMPLIANCE", "GESCHAEFTSLEITUNG", "ADMIN"],
};

const REQUESTER_ROLES: Role[] = ["INTERNE_REVISION", "ADMIN"];

function parseModule(raw: string): AccessModule {
  if (raw !== "OUTSOURCING" && raw !== "COMPLIANCE") {
    throw new ValidationError(`Unbekanntes Modul "${raw}" — erlaubt sind OUTSOURCING, COMPLIANCE.`);
  }
  return raw;
}

router.get(
  "/",
  requirePermission("moduleAccessGrant", "read"),
  asyncHandler(async (req, res) => {
    const grants = await prisma.moduleAccessGrant.findMany({ where: { institutionId: req.user!.institutionId } });
    res.json(grants);
  })
);

const requestSchema = z.object({ reason: z.string().optional() });

router.post(
  "/:module/request",
  asyncHandler(async (req, res) => {
    const accessModule = parseModule(req.params.module);
    if (!REQUESTER_ROLES.includes(req.user!.role)) {
      throw new ValidationError(`Rolle "${req.user!.role}" darf keine Zugriffsfreigabe anfragen.`);
    }
    const parsed = requestSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const before = await prisma.moduleAccessGrant.findUnique({
      where: { institutionId_module: { institutionId: req.user!.institutionId, module: accessModule } },
    });
    const updated = await withAudit(
      {
        entityType: "ModuleAccessGrant",
        entityId: before?.id ?? `${req.user!.institutionId}-${accessModule}`,
        action: before ? "UPDATE" : "CREATE",
        actor: req.user,
        ipAddress: req.ip,
        before,
      },
      (tx) =>
        tx.moduleAccessGrant.upsert({
          where: { institutionId_module: { institutionId: req.user!.institutionId, module: accessModule } },
          create: {
            institutionId: req.user!.institutionId,
            module: accessModule,
            status: "PENDING",
            requestedByUserId: req.user!.userId,
            requestedAt: new Date(),
            reason: parsed.data.reason,
          },
          // Erneutes Anfragen nach REVOKED/DENIED setzt wieder auf PENDING — ein bereits
          // APPROVED-Grant wird dadurch nicht zurückgestuft (keine versehentliche Sperre).
          update:
            before?.status === "APPROVED"
              ? {}
              : {
                  status: "PENDING",
                  requestedByUserId: req.user!.userId,
                  requestedAt: new Date(),
                  reason: parsed.data.reason,
                  decidedByUserId: null,
                  decidedAt: null,
                  decisionNote: null,
                },
        })
    );
    res.json(updated);
  })
);

const decisionSchema = z.object({ note: z.string().optional() });

for (const [status, path] of [
  ["APPROVED", "approve"],
  ["DENIED", "deny"],
  ["REVOKED", "revoke"],
] as const) {
  router.post(
    `/:module/${path}`,
    asyncHandler(async (req, res) => {
      const accessModule = parseModule(req.params.module);
      if (!APPROVER_ROLES[accessModule].includes(req.user!.role)) {
        throw new ValidationError(`Rolle "${req.user!.role}" darf Zugriff auf "${accessModule}" nicht ${path === "approve" ? "genehmigen" : path === "deny" ? "ablehnen" : "entziehen"}.`);
      }
      const parsed = decisionSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const before = await prisma.moduleAccessGrant.findUnique({
        where: { institutionId_module: { institutionId: req.user!.institutionId, module: accessModule } },
      });
      if (!before) throw new ValidationError("Es liegt keine Zugriffsanfrage für dieses Modul vor.");

      const updated = await withAudit(
        { entityType: "ModuleAccessGrant", entityId: before.id, action: "UPDATE", actor: req.user, ipAddress: req.ip, before },
        (tx) =>
          tx.moduleAccessGrant.update({
            where: { id: before.id },
            data: { status, decidedByUserId: req.user!.userId, decidedAt: new Date(), decisionNote: parsed.data.note },
          })
      );
      res.json(updated);
    })
  );
}

export default router;
