import { apiFetch } from "@/lib/regstack/backend-client";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { openClauseCount, type ContractRecord } from "@/lib/regstack/outsourcing";
import type { Database } from "@/lib/database.types";
import { listBalanceSheets, listIncomeStatements, buildBilanzSectionTotals, buildGuvSectionTotals, buildBiggestMovers } from "@/lib/regstack/accounting";
import { listBusinessProcesses, listControls, listControlTests, controlsDueForTesting } from "@/lib/regstack/ics";
import { listRisikostrategien } from "@/lib/regstack/risikomanagement";
import { listItRisiken, listItSicherheitsvorfaelle } from "@/lib/regstack/it-risiko";

export type ModuleType = Database["public"]["Enums"]["module_type"];

export type LatestReport = {
  id: string;
  module: ModuleType;
  report_type: string;
  status: string;
  period_from: string | null;
  period_to: string | null;
  finalized_at: string | null;
  // internal_audit still uses the plain single-value ack (that module never outgrew it).
  kenntnisnahme_by: string | null;
  kenntnisnahme_at: string | null;
  // Compliance tracks one row per acknowledger (ComplianceReportAcknowledgement) — this is
  // whether the CURRENT backend-session user specifically has acknowledged, not "has anyone".
  acknowledgedByMe: boolean | null;
  created_at: string;
};

type BackendComplianceReport = {
  id: string;
  reportType: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  finalizedAt: string | null;
  createdAt: string;
  acknowledgements: { userId: string }[];
};

type BackendRevisionReport = {
  id: string;
  reportType: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  finalizedAt: string | null;
  createdAt: string;
  kenntnisnahmeByUserId: string | null;
  kenntnisnahmeAt: string | null;
};

/** One row per module — outsourcing has no board-report feature built yet (its Prisma `Report`
 * model exists but nothing creates rows for it), so that key is always null, matching prior
 * behavior. Compliance and Interne Revision both read from the backend now. */
export async function getLatestReports(): Promise<Record<ModuleType, LatestReport | null>> {
  const session = await getBackendSession();
  const [complianceReports, revisionReports] = await Promise.all([
    session ? apiFetch<BackendComplianceReport[]>("/compliance/reports") : Promise.resolve([]),
    session ? apiFetch<BackendRevisionReport[]>("/revisions/reports") : Promise.resolve([]),
  ]);

  const result: Record<ModuleType, LatestReport | null> = { outsourcing: null, compliance: null, internal_audit: null };

  const latestCompliance = [...complianceReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestCompliance) {
    result.compliance = {
      id: latestCompliance.id,
      module: "compliance",
      report_type: latestCompliance.reportType,
      status: latestCompliance.status,
      period_from: latestCompliance.periodFrom?.slice(0, 10) ?? null,
      period_to: latestCompliance.periodTo?.slice(0, 10) ?? null,
      finalized_at: latestCompliance.finalizedAt,
      kenntnisnahme_by: null,
      kenntnisnahme_at: null,
      acknowledgedByMe: session ? latestCompliance.acknowledgements.some((a) => a.userId === session.userId) : false,
      created_at: latestCompliance.createdAt,
    };
  }

  const latestRevision = [...revisionReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestRevision) {
    result.internal_audit = {
      id: latestRevision.id,
      module: "internal_audit",
      report_type: latestRevision.reportType,
      status: latestRevision.status,
      period_from: latestRevision.periodFrom?.slice(0, 10) ?? null,
      period_to: latestRevision.periodTo?.slice(0, 10) ?? null,
      finalized_at: latestRevision.finalizedAt,
      kenntnisnahme_by: latestRevision.kenntnisnahmeByUserId,
      kenntnisnahme_at: latestRevision.kenntnisnahmeAt,
      acknowledgedByMe: null,
      created_at: latestRevision.createdAt,
    };
  }

  return result;
}

export type PendingExternePruefung = { id: string; pruefer: string; jahr: number; berichtsdatum: string | null };

type BackendExternePruefung = { id: string; pruefer: string; jahr: number; berichtsdatum: string | null; glKenntnisnahmeAt: string | null };

/** Externe Prüfberichte, die die Geschäftsleitung noch nicht zur Kenntnis genommen hat — sobald
 * sie das tut, verteilt die Interne Revision die Feststellungen an die Fachbereiche. */
export async function getPendingExternePruefungen(): Promise<PendingExternePruefung[]> {
  const session = await getBackendSession();
  if (!session) return [];
  const pruefungen = await apiFetch<BackendExternePruefung[]>("/revisions/externe-pruefungen");
  return pruefungen
    .filter((p) => !p.glKenntnisnahmeAt)
    .map((p) => ({ id: p.id, pruefer: p.pruefer, jahr: p.jahr, berichtsdatum: p.berichtsdatum?.slice(0, 10) ?? null }));
}

export type AuditPlan = {
  id: string;
  year: number;
  status: string;
  submitted_at: string | null;
  content: unknown;
};

type BackendAuditPlan = { id: string; year: number; status: string; submittedAt: string | null; content: unknown };

/** Prüfungspläne warten auf Genehmigung durch die Geschäftsleitung (Tz. 6). */
export async function getPendingAuditPlans(): Promise<AuditPlan[]> {
  const session = await getBackendSession();
  if (!session) return [];
  const plans = await apiFetch<BackendAuditPlan[]>("/revisions/universum/plans");
  return plans
    .filter((p) => p.status === "eingereicht")
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
    .map((p) => ({ id: p.id, year: p.year, status: p.status, submitted_at: p.submittedAt, content: p.content }));
}

export type DisputedNormzuweisung = {
  id: string;
  entity_id: string | null;
  target_person_id: string;
  proposed_by: string;
  dispute_reason: string | null;
  disputed_at: string | null;
  normBezeichnung: string;
  targetName: string;
  proposedByName: string;
};

type BackendUser = { id: string; name: string };
type BackendDisputedHandshake = {
  id: string;
  normId: string;
  assignedUserId: string;
  proposedByUserId: string;
  disputeReason: string | null;
  disputedAt: string | null;
  norm: { bezeichnung: string };
};

/** Normzuweisungen, bei denen der Fachbereich widersprochen hat — wartet auf die Entscheidung der
 * Geschäftsleitung (complianceHandshake.decide, RBAC-enforced server-side on the backend). */
export async function getDisputedNormzuweisungen(): Promise<DisputedNormzuweisung[]> {
  const session = await getBackendSession();
  if (!session) return [];

  const [handshakes, users] = await Promise.all([
    apiFetch<BackendDisputedHandshake[]>("/compliance/normen/handshakes/disputed"),
    apiFetch<BackendUser[]>("/users"),
  ]);
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return handshakes.map((h) => ({
    id: h.id,
    entity_id: h.normId,
    target_person_id: h.assignedUserId,
    proposed_by: h.proposedByUserId,
    dispute_reason: h.disputeReason,
    disputed_at: h.disputedAt,
    normBezeichnung: h.norm.bezeichnung,
    targetName: nameById.get(h.assignedUserId) ?? "—",
    proposedByName: nameById.get(h.proposedByUserId) ?? "—",
  }));
}

export type ModuleOverview = {
  outsourcing: {
    aktiv: number;
    wesentlich: number;
    // Monitoring (Tz. 9) and Contract (Tz. 7) sub-modules feed the same Outsourcing tile —
    // neither has its own board-report, so this is the only place their state reaches the GL.
    offeneEskalationen: number;
    offeneVertragspunkte: number;
    ausstehendeDependencyAcceptance: number;
  };
  compliance: { offeneFeststellungen: number };
  internalAudit: { offeneFeststellungen: number; pruefungsobjekte: number };
};

type BackendActivity = {
  status: string;
  isSubOutsourcing: boolean;
  riskAnalysis: { materiality: boolean | null } | null;
  contract: ContractRecord | null;
  handlungsoption: { status: string | null; depApprover: string | null } | null;
};
type BackendFeststellung = { status: string };
type BackendPruefungsobjekt = { id: string };
type BackendMonitoringEscalation = { id: string };

export async function getModuleOverview(): Promise<ModuleOverview> {
  const session = await getBackendSession();

  const [activities, complianceFeststellungen, revisionFeststellungen, pruefungsobjekte, escalations] = await Promise.all([
    session ? apiFetch<BackendActivity[]>("/activities") : Promise.resolve([]),
    session ? apiFetch<BackendFeststellung[]>("/compliance/feststellungen") : Promise.resolve([]),
    session ? apiFetch<BackendFeststellung[]>("/revisions/feststellungen") : Promise.resolve([]),
    session ? apiFetch<BackendPruefungsobjekt[]>("/revisions/universum") : Promise.resolve([]),
    session ? apiFetch<BackendMonitoringEscalation[]>("/activities/monitoring/escalations") : Promise.resolve([]),
  ]);

  return {
    outsourcing: {
      aktiv: activities.filter((a) => a.status === "AKTIV").length,
      wesentlich: activities.filter((a) => a.riskAnalysis?.materiality === true).length,
      offeneEskalationen: escalations.length,
      offeneVertragspunkte: activities.filter((a) => openClauseCount(a) > 0).length,
      ausstehendeDependencyAcceptance: activities.filter(
        (a) => a.handlungsoption?.status === "BCM_LINKED" && !a.handlungsoption?.depApprover
      ).length,
    },
    compliance: { offeneFeststellungen: complianceFeststellungen.filter((f) => f.status !== "geschlossen").length },
    internalAudit: {
      offeneFeststellungen: revisionFeststellungen.filter((f) => f.status !== "geschlossen").length,
      pruefungsobjekte: pruefungsobjekte.length,
    },
  };
}

/** Feeds the dashboard's Bilanz/GuV period-over-period widget — same aggregation helpers the
 * Buchhaltung overview page itself uses, so the two read the numbers identically. */
export async function getAccountingAnalysis() {
  const session = await getBackendSession();
  if (!session) {
    return { bilanzData: [], bilanzYears: [], guvData: [], guvYears: [], bilanzMovers: [], guvMovers: [] };
  }
  const [balanceSheets, incomeStatements] = await Promise.all([listBalanceSheets(), listIncomeStatements()]);
  const { data: bilanzData, years: bilanzYears } = buildBilanzSectionTotals(balanceSheets);
  const { data: guvData, years: guvYears } = buildGuvSectionTotals(incomeStatements);
  return {
    bilanzData,
    bilanzYears,
    guvData,
    guvYears,
    bilanzMovers: buildBiggestMovers(balanceSheets),
    guvMovers: buildBiggestMovers(incomeStatements),
  };
}

export type IcsAtAGlance = { processCount: number; controlCount: number; dueForTesting: number };

export async function getIcsAtAGlance(): Promise<IcsAtAGlance> {
  const session = await getBackendSession();
  if (!session) return { processCount: 0, controlCount: 0, dueForTesting: 0 };
  const [processes, controls, tests] = await Promise.all([listBusinessProcesses(), listControls(), listControlTests()]);
  return { processCount: processes.length, controlCount: controls.length, dueForTesting: controlsDueForTesting(controls, tests) };
}

export type RiskAndItAtAGlance = {
  risikostrategieVerabschiedet: boolean;
  offeneItRisiken: number;
  offeneVorfaelle: number;
  kritischeOffeneVorfaelle: number;
};

export async function getRiskAndItAtAGlance(): Promise<RiskAndItAtAGlance> {
  const session = await getBackendSession();
  if (!session) {
    return { risikostrategieVerabschiedet: false, offeneItRisiken: 0, offeneVorfaelle: 0, kritischeOffeneVorfaelle: 0 };
  }
  const [strategien, itRisiken, vorfaelle] = await Promise.all([
    listRisikostrategien(),
    listItRisiken(),
    listItSicherheitsvorfaelle(),
  ]);
  const currentYear = new Date().getFullYear();
  const risikostrategieVerabschiedet = strategien.some(
    (s) => s.art === "risikostrategie" && s.status === "verabschiedet" && s.jahr === currentYear
  );
  const offeneItRisiken = itRisiken.filter((r) => r.status === "offen" || r.status === "in_bearbeitung").length;
  const offeneVorfaelle = vorfaelle.filter((v) => v.status !== "geschlossen").length;
  const kritischeOffeneVorfaelle = vorfaelle.filter((v) => v.status !== "geschlossen" && v.schweregrad === "kritisch").length;
  return { risikostrategieVerabschiedet, offeneItRisiken, offeneVorfaelle, kritischeOffeneVorfaelle };
}

export type MonitoringEscalation = {
  id: string;
  activityId: string;
  activityName: string;
  evidenceDate: string | null;
  evidenceDescription: string | null;
  escalationNote: string | null;
};

type BackendMonitoringEscalationDetail = {
  id: string;
  evidenceDate: string | null;
  evidenceDescription: string | null;
  escalationNote: string | null;
  activity: { id: string; name: string };
};

/** Monitoring-Einträge (Tz. 9) mit escalationNeeded=true — die Geschäftsleitung ist die
 * naheliegende Eskalationsadresse für Auffälligkeiten aus dem laufenden Auslagerungsmonitoring. */
export async function getMonitoringEscalations(): Promise<MonitoringEscalation[]> {
  const session = await getBackendSession();
  if (!session) return [];
  const records = await apiFetch<BackendMonitoringEscalationDetail[]>("/activities/monitoring/escalations");
  return records.map((r) => ({
    id: r.id,
    activityId: r.activity.id,
    activityName: r.activity.name,
    evidenceDate: r.evidenceDate,
    evidenceDescription: r.evidenceDescription,
    escalationNote: r.escalationNote,
  }));
}

export type PendingDependencyApproval = {
  activityId: string;
  activityName: string;
  ersetzbarkeit: string | null;
  reviewDate: string | null;
  depControls: string | null;
};

type BackendActivityWithHandlungsoption = {
  id: string;
  name: string;
  handlungsoption: {
    status: string | null;
    depApprover: string | null;
    ersetzbarkeit: string | null;
    reviewDate: string | null;
    depControls: string | null;
  } | null;
};

/** Handlungsoptionen (Tz. 6) im BCM_LINKED-Pfad ohne depApprover — die Dependency-Acceptance
 * darf ausschließlich die Geschäftsleitung bestätigen (RBAC "handlungsoption.approve"). */
export async function getPendingDependencyApprovals(): Promise<PendingDependencyApproval[]> {
  const session = await getBackendSession();
  if (!session) return [];
  const activities = await apiFetch<BackendActivityWithHandlungsoption[]>("/activities");
  return activities
    .filter((a) => a.handlungsoption?.status === "BCM_LINKED" && !a.handlungsoption?.depApprover)
    .map((a) => ({
      activityId: a.id,
      activityName: a.name,
      ersetzbarkeit: a.handlungsoption?.ersetzbarkeit ?? null,
      reviewDate: a.handlungsoption?.reviewDate ?? null,
      depControls: a.handlungsoption?.depControls ?? null,
    }));
}
