import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// AuditLogEvent has no module/institutionId column of its own — "module" is inferred from
// entityType, and institution scoping goes through the actor (every write here comes from an
// authenticated req.user, so actor.institutionId is always present for these entity types).
const MODULE_ENTITY_TYPES: Record<string, string[]> = {
  outsourcing: ["OutsourcingActivity", "Contract", "HandlungsoptionRecord", "MonitoringRecord", "RiskAnalysis", "Weiterverlagerung", "Report"],
  compliance: [
    "Quelle",
    "RegulatorischeAenderung",
    "Norm",
    "NormAssignmentHandshake",
    "Feststellung",
    "ComplianceRating",
    "ComplianceGovernanceSettings",
    "ComplianceReport",
    "ComplianceReportAcknowledgement",
  ],
  internal_audit: [
    "Pruefungsobjekt",
    "AuditPlan",
    "Pruefung",
    "PruefungZuweisung",
    "Pruefungsschritt",
    "Arbeitspapier",
    "Revisionsfeststellung",
    "RevisionFristverlaengerung",
    "RevisionPersonal",
    "RevisionSchulung",
    "RevisionSperrfrist",
    "RevisionSonderwissen",
    "RevisionEinstellungen",
    "RevisionQualitaetssicherung",
    "RevisionProjektbegleitung",
    "RevisionZugriffsvorfall",
    "RevisionGlMitteilung",
    "RevisionSonderauftrag",
    "RevisionReport",
    "ExternePruefung",
    "ExternePruefungFeststellung",
  ],
};

// Read-only by construction — there is deliberately no PUT/PATCH/DELETE route for audit_log_events
// anywhere in this codebase; the only writer is withAudit() inside the same transaction as the
// entity write it documents.
router.get(
  "/",
  requirePermission("auditLog", "read"),
  asyncHandler(async (req, res) => {
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const module = typeof req.query.module === "string" ? req.query.module : undefined;
    const moduleEntityTypes = module ? MODULE_ENTITY_TYPES[module] : undefined;

    const events = await prisma.auditLogEvent.findMany({
      where: {
        entityType: entityType ?? (moduleEntityTypes ? { in: moduleEntityTypes } : undefined),
        entityId,
        actor: { institutionId: req.user!.institutionId },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
      include: { actor: { select: { name: true, role: true, email: true } } },
    });
    res.json(events);
  })
);

export default router;
