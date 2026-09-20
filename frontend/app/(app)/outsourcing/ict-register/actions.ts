"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { IctArrangement, IctArrangementStatus, IctProvider, IctProviderType, IctService, IctSubcontracting } from "@/lib/regstack/ict-register";

export type ProviderInput = {
  name: string;
  legalEntityIdentifier: string;
  country: string;
  providerType: IctProviderType;
  parentUndertaking: string;
};

function providerBody(fields: ProviderInput) {
  return {
    name: fields.name,
    legalEntityIdentifier: fields.legalEntityIdentifier || undefined,
    country: fields.country || undefined,
    providerType: fields.providerType,
    parentUndertaking: fields.providerType === "KONZERNINTERN" ? fields.parentUndertaking || undefined : undefined,
  };
}

export async function addIctProvider(fields: ProviderInput) {
  await apiFetch<IctProvider>("/ict-register/providers", { method: "POST", body: JSON.stringify(providerBody(fields)) });
  revalidatePath("/outsourcing/ict-register");
}

export async function updateIctProvider(id: string, fields: ProviderInput) {
  await apiFetch<IctProvider>(`/ict-register/providers/${id}`, { method: "PUT", body: JSON.stringify(providerBody(fields)) });
  revalidatePath("/outsourcing/ict-register");
}

export async function deleteIctProvider(id: string) {
  await apiFetch(`/ict-register/providers/${id}`, { method: "DELETE" });
  revalidatePath("/outsourcing/ict-register");
}

export type ArrangementInput = {
  providerId: string;
  functionDescription: string;
  supportsCriticalFunction: boolean;
  criticalityReason: string;
  contractStart: string;
  contractEnd: string;
  terminationNoticeMonths: string;
  annualCostEur: string;
  exitStrategyNote: string;
  dataCategories: string;
  hasSubcontracting: boolean;
  subcontractingNote: string;
  status: IctArrangementStatus;
};

function arrangementBody(fields: ArrangementInput) {
  if (fields.supportsCriticalFunction && !fields.criticalityReason.trim()) {
    throw new Error("Begründung ist Pflicht, sobald das Vertragsverhältnis als kritisch/wichtig markiert ist (Art. 28 Abs. 3).");
  }
  return {
    providerId: fields.providerId,
    functionDescription: fields.functionDescription,
    supportsCriticalFunction: fields.supportsCriticalFunction,
    criticalityReason: fields.supportsCriticalFunction ? fields.criticalityReason : undefined,
    contractStart: fields.contractStart ? new Date(fields.contractStart).toISOString() : undefined,
    contractEnd: fields.contractEnd ? new Date(fields.contractEnd).toISOString() : undefined,
    terminationNoticeMonths: fields.terminationNoticeMonths ? Number(fields.terminationNoticeMonths) : undefined,
    annualCostEur: fields.annualCostEur ? Number(fields.annualCostEur) : undefined,
    exitStrategyNote: fields.exitStrategyNote || undefined,
    dataCategories: fields.dataCategories || undefined,
    hasSubcontracting: fields.hasSubcontracting,
    subcontractingNote: fields.hasSubcontracting ? fields.subcontractingNote || undefined : undefined,
    status: fields.status,
  };
}

export async function addIctArrangement(fields: ArrangementInput) {
  await apiFetch<IctArrangement>("/ict-register/arrangements", { method: "POST", body: JSON.stringify(arrangementBody(fields)) });
  revalidatePath("/outsourcing/ict-register");
}

export async function updateIctArrangement(id: string, fields: ArrangementInput) {
  await apiFetch<IctArrangement>(`/ict-register/arrangements/${id}`, { method: "PUT", body: JSON.stringify(arrangementBody(fields)) });
  revalidatePath("/outsourcing/ict-register");
}

export type ServiceInput = { serviceDescription: string; serviceLevelObjective?: string };

export async function addIctService(arrangementId: string, fields: ServiceInput) {
  await apiFetch<IctService>(`/ict-register/arrangements/${arrangementId}/services`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  revalidatePath("/outsourcing/ict-register");
}

export type SubcontractingNodeInput = { provider: string; country?: string; description?: string };

export async function addIctSubcontractingNode(arrangementId: string, parentId: string | null, fields: SubcontractingNodeInput) {
  await apiFetch<IctSubcontracting>(`/ict-register/arrangements/${arrangementId}/subcontracting`, {
    method: "POST",
    body: JSON.stringify({ parentId, ...fields }),
  });
  revalidatePath("/outsourcing/ict-register");
}

// Soft-delete: the backend walks the node's descendants itself (never trusts a client-supplied id
// list) and sets status=ENTFERNT on the whole subtree — same pattern as removeWeiterverlagerungNode.
export async function removeIctSubcontractingNode(arrangementId: string, nodeId: string) {
  await apiFetch(`/ict-register/arrangements/${arrangementId}/subcontracting/${nodeId}/remove`, { method: "POST" });
  revalidatePath("/outsourcing/ict-register");
}
