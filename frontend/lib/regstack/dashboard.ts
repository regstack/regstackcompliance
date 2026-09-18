import { apiFetch } from "@/lib/regstack/backend-client";
import { getBackendSession } from "@/lib/regstack/backend-session";
import type { Database } from "@/lib/database.types";

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
  outsourcing: { aktiv: number; wesentlich: number };
  compliance: { offeneFeststellungen: number };
  internalAudit: { offeneFeststellungen: number; pruefungsobjekte: number };
};

type BackendActivity = { status: string; riskAnalysis: { materiality: boolean | null } | null };
type BackendFeststellung = { status: string };
type BackendPruefungsobjekt = { id: string };

export async function getModuleOverview(): Promise<ModuleOverview> {
  const session = await getBackendSession();

  const [activities, complianceFeststellungen, revisionFeststellungen, pruefungsobjekte] = await Promise.all([
    session ? apiFetch<BackendActivity[]>("/activities") : Promise.resolve([]),
    session ? apiFetch<BackendFeststellung[]>("/compliance/feststellungen") : Promise.resolve([]),
    session ? apiFetch<BackendFeststellung[]>("/revisions/feststellungen") : Promise.resolve([]),
    session ? apiFetch<BackendPruefungsobjekt[]>("/revisions/universum") : Promise.resolve([]),
  ]);

  return {
    outsourcing: {
      aktiv: activities.filter((a) => a.status === "AKTIV").length,
      wesentlich: activities.filter((a) => a.riskAnalysis?.materiality === true).length,
    },
    compliance: { offeneFeststellungen: complianceFeststellungen.filter((f) => f.status !== "geschlossen").length },
    internalAudit: {
      offeneFeststellungen: revisionFeststellungen.filter((f) => f.status !== "geschlossen").length,
      pruefungsobjekte: pruefungsobjekte.length,
    },
  };
}
