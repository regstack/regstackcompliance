"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { ClauseStatus, ContractRecord, HandlungsoptionRecord, MonitoringRecord } from "@/lib/regstack/outsourcing";
import type { Handlungsoption } from "@/lib/regstack/classification";

export type ChecklistStatus = "erfuellt" | "nicht_erfuellt" | "in_ueberarbeitung";

const CHECKLIST_STATUS_TO_BACKEND: Record<ChecklistStatus, ClauseStatus> = {
  erfuellt: "ERFUELLT",
  nicht_erfuellt: "NICHT_ERFUELLT",
  in_ueberarbeitung: "IN_UEBERARBEITUNG",
};

export async function setChecklistStatus(activityId: string, code: string, status: ChecklistStatus, notiz: string | null) {
  const activity = await apiFetch<{ contract: ContractRecord | null }>(`/activities/${activityId}`);
  const clauseChecklist = { ...(activity.contract?.clauseChecklist ?? {}), [code]: CHECKLIST_STATUS_TO_BACKEND[status] };
  const clauseJustifications = { ...(activity.contract?.clauseJustifications ?? {}) };
  if (status !== "erfuellt" && notiz) {
    clauseJustifications[code] = notiz;
  } else {
    delete clauseJustifications[code];
  }

  await apiFetch(`/activities/${activityId}/contract`, {
    method: "PUT",
    body: JSON.stringify({ clauseChecklist, clauseJustifications }),
  });

  revalidatePath(`/outsourcing/${activityId}`);
}

export async function activateActivity(activityId: string) {
  await apiFetch(`/activities/${activityId}/activate`, { method: "POST" });
  revalidatePath(`/outsourcing/${activityId}`);
  revalidatePath("/outsourcing");
}

const HANDLUNGSOPTION_STATUS_TO_BACKEND: Record<string, string> = {
  adopted_options: "ADOPTED_OPTIONS",
  exit_strategy: "EXIT_STRATEGY",
  bcm_linked: "BCM_LINKED",
};

const ERSETZBARKEIT_TO_BACKEND: Record<string, string> = {
  leicht: "LEICHT",
  schwierig: "SCHWIERIG",
  "unmöglich": "UNMOEGLICH",
};

/**
 * Saves the Tz. 6 Handlungsoption/Ausstiegsstrategie. Note: the backend's HandlungsoptionRecord
 * has no columns for the frontend's supplementary altProvider/altTransition/testDate fields —
 * only status, strategyDescription, ersetzbarkeit, transitionMonths, reviewDate, and the
 * depApprover/depDate/depControls (BCM_LINKED) cluster persist. The other three are UI-only
 * until the schema grows a place for them.
 */
export async function saveHandlungsoption(activityId: string, handlungsoption: Handlungsoption) {
  if (!handlungsoption.status) throw new Error("Bitte eine der drei Optionen wählen.");

  await apiFetch<HandlungsoptionRecord>(`/activities/${activityId}/handlungsoption`, {
    method: "PUT",
    body: JSON.stringify({
      status: HANDLUNGSOPTION_STATUS_TO_BACKEND[handlungsoption.status],
      strategyDescription: handlungsoption.strategyDescription || undefined,
      ersetzbarkeit: ERSETZBARKEIT_TO_BACKEND[handlungsoption.ersetzbarkeit],
      transitionMonths: handlungsoption.transitionMonths || undefined,
      reviewDate: handlungsoption.reviewDate ? new Date(handlungsoption.reviewDate).toISOString() : undefined,
      depControls: handlungsoption.depControls || undefined,
    }),
  });

  if (handlungsoption.status === "bcm_linked" && handlungsoption.depApprover) {
    await apiFetch(`/activities/${activityId}/handlungsoption/approve`, {
      method: "POST",
      body: JSON.stringify({ depApprover: handlungsoption.depApprover }),
    });
  }

  revalidatePath(`/outsourcing/${activityId}`);
}

export type RiskAnalysisInput = {
  quickTriggers: Record<string, boolean>;
  materialityRatings: Record<string, number>;
  secondDimensionRatings: Record<string, number>;
  criticality: "OFFEN" | "KRITISCH" | "NICHT_KRITISCH";
  criticalityReason: string;
  overrideActive: boolean;
  overrideMaterial: boolean | null;
  overrideReason: string;
  overrideApprover: string;
};

// CSC model only (see csc-criteria.ts) — submits straight to the server-authoritative
// PUT .../risk-analysis, which recomputes materialityScore/secondScore/computedMaterial itself.
export async function saveRiskAnalysis(activityId: string, input: RiskAnalysisInput) {
  if (input.overrideActive && input.overrideMaterial === null) {
    throw new Error("Override aktiv, aber keine finale Einstufung angegeben.");
  }

  await apiFetch(`/activities/${activityId}/risk-analysis`, {
    method: "PUT",
    body: JSON.stringify({
      quickTriggers: input.quickTriggers,
      materialityRatings: input.materialityRatings,
      secondDimensionRatings: input.secondDimensionRatings,
      criticality: input.criticality,
      criticalityReason: input.criticalityReason || undefined,
      overrideActive: input.overrideActive,
      overrideMaterial: input.overrideActive ? input.overrideMaterial : null,
      overrideReason: input.overrideActive ? input.overrideReason || undefined : undefined,
      overrideApprover: input.overrideActive ? input.overrideApprover || undefined : undefined,
    }),
  });

  revalidatePath(`/outsourcing/${activityId}`);
}

export type MonitoringInput =
  | {
      type: "EVIDENCE_LOG";
      evidenceDate: string;
      evidenceDescription: string;
      escalationNeeded: boolean;
      escalationNote: string;
      assuranceReportDueDate: string;
    }
  | { type: "KPI"; kpiName: string; kpiTarget: string; kpiAchieved: string; kpiComment: string };

export async function addMonitoringRecord(activityId: string, input: MonitoringInput) {
  const body =
    input.type === "EVIDENCE_LOG"
      ? {
          type: "EVIDENCE_LOG",
          evidenceDate: new Date(input.evidenceDate).toISOString(),
          evidenceDescription: input.evidenceDescription,
          escalationNeeded: input.escalationNeeded,
          escalationNote: input.escalationNote || undefined,
          assuranceReportDueDate: input.assuranceReportDueDate ? new Date(input.assuranceReportDueDate).toISOString() : undefined,
        }
      : {
          type: "KPI",
          kpiName: input.kpiName,
          kpiTarget: input.kpiTarget || undefined,
          kpiAchieved: input.kpiAchieved || undefined,
          kpiComment: input.kpiComment || undefined,
        };

  await apiFetch<MonitoringRecord>(`/activities/${activityId}/monitoring`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  revalidatePath(`/outsourcing/${activityId}`);
}
