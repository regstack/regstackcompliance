"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import {
  createActivity as createActivityBackend,
  updateActivityStammdaten as updateActivityStammdatenBackend,
} from "@/lib/regstack/outsourcing";
import type {
  ClauseStatus,
  ContractRecord,
  CreateActivityInput,
  HandlungsoptionRecord,
  MonitoringRecord,
  StammdatenInput,
  WeiterverlagerungNode,
} from "@/lib/regstack/outsourcing";
import type { Handlungsoption } from "@/lib/regstack/classification";

export async function createActivity(input: CreateActivityInput) {
  const created = await createActivityBackend(input);
  revalidatePath("/outsourcing");
  return created.id;
}

export async function updateActivityStammdaten(activityId: string, input: StammdatenInput) {
  await updateActivityStammdatenBackend(activityId, input);
  revalidatePath(`/outsourcing/${activityId}`);
  revalidatePath("/outsourcing");
}

export type ChecklistStatus = "erfuellt" | "nicht_erfuellt" | "in_ueberarbeitung";

const CHECKLIST_STATUS_TO_BACKEND: Record<ChecklistStatus, ClauseStatus> = {
  erfuellt: "ERFUELLT",
  nicht_erfuellt: "NICHT_ERFUELLT",
  in_ueberarbeitung: "IN_UEBERARBEITUNG",
};

/** Step 1 of the upload flow: asks the backend to mint a pre-signed PUT URL, so the file's bytes
 * go straight from the browser to object storage and never through this Next.js server or its
 * apiFetch layer — apiFetch is used here only to fetch the (small) URL itself. */
export async function getContractUploadUrl(activityId: string, fileName: string, fileMime: string, fileSize: number) {
  return apiFetch<{ uploadUrl: string; objectKey: string }>(`/activities/${activityId}/contract/upload-url`, {
    method: "POST",
    body: JSON.stringify({ fileName, fileMime, fileSize }),
  });
}

/** Step 2: once the browser's own PUT to `uploadUrl` has succeeded, registers the resulting
 * objectKey as the activity's contract document — mirrors setChecklistStatus's
 * read-then-merge-then-PUT pattern so an in-flight checklist edit isn't clobbered by this call
 * (and vice versa). */
export async function registerContractFile(
  activityId: string,
  file: { objectKey: string; fileName: string; fileSize: number; fileMime: string }
) {
  const activity = await apiFetch<{ contract: ContractRecord | null }>(`/activities/${activityId}`);
  await apiFetch(`/activities/${activityId}/contract`, {
    method: "PUT",
    body: JSON.stringify({
      clauseChecklist: activity.contract?.clauseChecklist ?? {},
      clauseJustifications: activity.contract?.clauseJustifications ?? {},
      fileObjectKey: file.objectKey,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileMime: file.fileMime,
    }),
  });
  revalidatePath(`/outsourcing/${activityId}`);
}

export async function getContractDownloadUrl(activityId: string) {
  const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`/activities/${activityId}/contract/download-url`);
  return downloadUrl;
}

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

export type ActivityStatus = "ENTWURF" | "AKTIV" | "BEENDET";

export async function setActivityStatus(activityId: string, status: ActivityStatus) {
  await apiFetch(`/activities/${activityId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
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
 * only status, strategyDescription, ersetzbarkeit, transitionMonths, reviewDate, and depControls
 * persist here. The other three are UI-only until the schema grows a place for them.
 *
 * Deliberately does NOT touch depApprover/depDate — the dependency-acceptance confirmation is a
 * separate, Geschäftsleitung/Admin-only step (see approveHandlungsoption below), enforced
 * server-side via the "handlungsoption.approve" RBAC resource, which this endpoint's caller may
 * not hold even when they can write everything else on this record.
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

  revalidatePath(`/outsourcing/${activityId}`);
}

/** Dependency-Acceptance-Bestätigung (Tz. 6 S.3, BCM_LINKED-Pfad) — Geschäftsleitung/Admin only,
 * enforced server-side ("handlungsoption.approve"). Kept as its own action so it can be called
 * independently of saveHandlungsoption, which a Geschäftsleitung-role user cannot call (they
 * don't hold "handlungsoption" write, only the approve step). */
export async function approveHandlungsoption(activityId: string, depApprover: string) {
  if (!depApprover.trim()) throw new Error("Bitte den Namen der genehmigenden Person angeben.");

  await apiFetch(`/activities/${activityId}/handlungsoption/approve`, {
    method: "POST",
    body: JSON.stringify({ depApprover }),
  });

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

// Submits straight to the server-authoritative PUT .../risk-analysis, which recomputes
// materialityScore/secondScore/computedMaterial itself using the institution's CSC or Tesla-FS
// model (classify.ts) — the criteria ids depend on which model applies (see csc-criteria.ts /
// tesla-criteria.ts), never on a fixed set chosen here.
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
  revalidatePath("/outsourcing");
}

export type MonitoringInput =
  | {
      type: "EVIDENCE_LOG";
      evidenceDate: string;
      evidenceDescription: string;
      assuranceType: string;
      bridgeCoverage: string;
      reviewerName: string;
      reviewedAt: string;
      materialChange: boolean;
      changeNote: string;
      escalationNeeded: boolean;
      escalationNote: string;
      assuranceReportDueDate: string;
    }
  | { type: "KPI"; kpiName: string; kpiTarget: string; kpiAchieved: string; kpiComment: string };

// Every call APPENDS a new MonitoringRecord — the backend models Tz. 9 monitoring as a history of
// evidence-log/KPI entries, not a single mutable form, so there is no "load current state and
// overwrite" here.
export async function addMonitoringRecord(activityId: string, input: MonitoringInput) {
  const body =
    input.type === "EVIDENCE_LOG"
      ? {
          type: "EVIDENCE_LOG",
          evidenceDate: new Date(input.evidenceDate).toISOString(),
          evidenceDescription: input.evidenceDescription,
          assuranceType: input.assuranceType || undefined,
          bridgeCoverage: input.bridgeCoverage || undefined,
          reviewerName: input.reviewerName || undefined,
          reviewedAt: input.reviewedAt ? new Date(input.reviewedAt).toISOString() : undefined,
          materialChange: input.materialChange,
          changeNote: input.materialChange ? input.changeNote || undefined : undefined,
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

export type ChainNodeInput = { provider: string; country?: string; description?: string };

export async function addWeiterverlagerungNode(activityId: string, parentId: string | null, fields: ChainNodeInput) {
  await apiFetch<WeiterverlagerungNode>(`/activities/${activityId}/weiterverlagerung`, {
    method: "POST",
    body: JSON.stringify({ parentId, ...fields }),
  });
  revalidatePath(`/outsourcing/${activityId}`);
}

export async function updateWeiterverlagerungNode(nodeId: string, activityId: string, fields: ChainNodeInput) {
  await apiFetch<WeiterverlagerungNode>(`/activities/${activityId}/weiterverlagerung/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  revalidatePath(`/outsourcing/${activityId}`);
}

// Soft-delete: the backend walks the node's descendants itself (never trusts a client-supplied id
// list) and sets status=ENTFERNT on the whole subtree.
export async function removeWeiterverlagerungNode(activityId: string, nodeId: string) {
  await apiFetch(`/activities/${activityId}/weiterverlagerung/${nodeId}/remove`, { method: "POST" });
  revalidatePath(`/outsourcing/${activityId}`);
}
