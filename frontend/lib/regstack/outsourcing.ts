import { apiFetch, BackendError } from "@/lib/regstack/backend-client";
import { CONTRACT_CHECKLIST_CATALOG } from "@/lib/regstack/contract-checklist-catalog";
import { emptyHandlungsoption, type Handlungsoption } from "@/lib/regstack/classification";

export type ActivityStatus = "ENTWURF" | "AKTIV" | "BEENDET";
export type ScopeType = "AUSLAGERUNG" | "SONSTIGER_FREMDBEZUG" | "IKT_DORA";
export type HandlungsoptionStatus = "ADOPTED_OPTIONS" | "EXIT_STRATEGY" | "BCM_LINKED";
export type Ersetzbarkeit = "LEICHT" | "SCHWIERIG" | "UNMOEGLICH";
export type ClauseStatus = "ERFUELLT" | "NICHT_ERFUELLT" | "IN_UEBERARBEITUNG";

export type Criticality = "OFFEN" | "KRITISCH" | "NICHT_KRITISCH";

export type RiskAnalysis = {
  quickTriggers: Record<string, boolean>;
  materialityRatings: Record<string, number>;
  secondDimensionRatings: Record<string, number>;
  materialityScore: number | null;
  secondScore: number | null;
  inherentScore: number | null;
  computedMaterial: boolean | null;
  criticalSuggestion: boolean | null;
  materiality: boolean | null;
  criticality: Criticality;
  criticalityReason: string | null;
  overrideActive: boolean;
  overrideMaterial: boolean | null;
  overrideReason: string | null;
  overrideApprover: string | null;
};

export type MonitoringRecord = {
  id: string;
  type: "EVIDENCE_LOG" | "KPI";
  createdAt: string;
  evidenceDate: string | null;
  evidenceDescription: string | null;
  escalationNeeded: boolean;
  escalationNote: string | null;
  assuranceReportDueDate: string | null;
  assuranceType: string | null;
  bridgeCoverage: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  materialChange: boolean;
  changeNote: string | null;
  kpiName: string | null;
  kpiTarget: string | null;
  kpiAchieved: string | null;
  kpiComment: string | null;
};

export type HandlungsoptionRecord = {
  status: HandlungsoptionStatus | null;
  strategyDescription: string | null;
  ersetzbarkeit: Ersetzbarkeit | null;
  transitionMonths: number | null;
  reviewDate: string | null;
  depApprover: string | null;
  depDate: string | null;
  depControls: string | null;
};

export type ContractRecord = {
  clauseChecklist: Record<string, ClauseStatus>;
  clauseJustifications: Record<string, string>;
  fileObjectKey: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
  uploadedAt: string | null;
};

export type WeiterverlagerungStatus = "AKTIV" | "ENTFERNT";

export type WeiterverlagerungNode = {
  id: string;
  parentId: string | null;
  level: number;
  provider: string;
  country: string | null;
  description: string | null;
  status: WeiterverlagerungStatus;
};

export type SpecialFunction = "KEINE" | "RISIKOCONTROLLING" | "COMPLIANCE" | "INTERNE_REVISION" | "KERNBANKBEREICH";

export type OutsourcingActivity = {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  bafinReferenceNumber: string | null;
  scope: ScopeType;
  scopeJustification: string | null;
  status: ActivityStatus;
  contractStart: string | null;
  contractEnd: string | null;
  terminationNoticeMonths: number | null;
  serviceLocations: string | null;
  dataCategories: string | null;
  isCloud: boolean;
  isSubOutsourcing: boolean;
  groupInternal: boolean;
  specialFunction: SpecialFunction;
  createdAt: string;
  deepDive: boolean;
  riskAnalysis: RiskAnalysis | null;
  handlungsoption: HandlungsoptionRecord | null;
  contract: ContractRecord | null;
  // Only present on the single-activity GET (list responses don't include this relation).
  monitoringRecords?: MonitoringRecord[];
};

export async function listActivities(): Promise<OutsourcingActivity[]> {
  return apiFetch<OutsourcingActivity[]>("/activities");
}

export type CreateActivityInput = {
  name: string;
  category: string;
  provider?: string;
  scope: ScopeType;
  scopeJustification?: string;
};

export async function createActivity(input: CreateActivityInput): Promise<OutsourcingActivity> {
  return apiFetch<OutsourcingActivity>("/activities", { method: "POST", body: JSON.stringify(input) });
}

export type StammdatenInput = Partial<{
  name: string;
  category: string;
  provider: string;
  bafinReferenceNumber: string;
  scope: ScopeType;
  scopeJustification: string;
  contractStart: string;
  contractEnd: string;
  terminationNoticeMonths: number;
  serviceLocations: string;
  dataCategories: string;
  isCloud: boolean;
  isSubOutsourcing: boolean;
  groupInternal: boolean;
  specialFunction: SpecialFunction;
  deepDive: boolean;
}>;

export async function updateActivityStammdaten(id: string, input: StammdatenInput): Promise<OutsourcingActivity> {
  return apiFetch<OutsourcingActivity>(`/activities/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function getActivity(id: string): Promise<OutsourcingActivity | null> {
  try {
    return await apiFetch<OutsourcingActivity>(`/activities/${id}`);
  } catch (e) {
    if (e instanceof BackendError && e.status === 404) return null;
    throw e;
  }
}

export async function getWeiterverlagerungskette(activityId: string): Promise<WeiterverlagerungNode[]> {
  return apiFetch<WeiterverlagerungNode[]>(`/activities/${activityId}/weiterverlagerung`);
}

const HANDLUNGSOPTION_STATUS_TO_FRONTEND: Record<string, Handlungsoption["status"]> = {
  ADOPTED_OPTIONS: "adopted_options",
  EXIT_STRATEGY: "exit_strategy",
  BCM_LINKED: "bcm_linked",
};
const ERSETZBARKEIT_TO_FRONTEND: Record<string, Handlungsoption["ersetzbarkeit"]> = {
  LEICHT: "leicht",
  SCHWIERIG: "schwierig",
  UNMOEGLICH: "unmöglich",
};

// The HandlungsoptionPanel component (and its Classification-based types) predate the backend
// migration — reused here rather than duplicated, since its form fields/options still match.
// altProvider/altTransition/testDate have no backend column yet (see actions.ts) and always
// come back empty.
export function toFrontendHandlungsoption(record: HandlungsoptionRecord | null): Handlungsoption {
  const base = emptyHandlungsoption();
  if (!record?.status) return base;
  return {
    ...base,
    status: HANDLUNGSOPTION_STATUS_TO_FRONTEND[record.status] ?? "",
    strategyDescription: record.strategyDescription ?? "",
    ersetzbarkeit: (record.ersetzbarkeit && ERSETZBARKEIT_TO_FRONTEND[record.ersetzbarkeit]) || base.ersetzbarkeit,
    transitionMonths: record.transitionMonths ?? base.transitionMonths,
    reviewDate: record.reviewDate?.slice(0, 10) ?? "",
    depApprover: record.depApprover ?? "",
    depDate: record.depDate?.slice(0, 10) ?? "",
    depControls: record.depControls ?? "",
  };
}

// A catalog code missing from clauseChecklist has never been assessed — treated the same as
// "NICHT_ERFUELLT" (not yet confirmed fulfilled) — so this must walk the applicable catalog
// rather than just counting explicit non-ERFUELLT entries.
export function openClauseCount(activity: Pick<OutsourcingActivity, "contract" | "isSubOutsourcing">): number {
  const checklist = activity.contract?.clauseChecklist ?? {};
  return CONTRACT_CHECKLIST_CATALOG.filter((item) => activity.isSubOutsourcing || !item.nurBeiWeiterverlagerung).filter(
    (item) => (checklist[item.code] ?? "NICHT_ERFUELLT") !== "ERFUELLT"
  ).length;
}
