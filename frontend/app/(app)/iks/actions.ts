"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

const REVALIDATE = "/iks";

export async function createBusinessProcess(input: { name: string; owner?: string; description?: string }) {
  const created = await apiFetch<{ id: string }>("/ics/processes", { method: "POST", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateBusinessProcess(id: string, input: { name?: string; owner?: string; description?: string }) {
  await apiFetch(`/ics/processes/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
}

export type ControlInput = {
  name: string;
  controlType: "ITGC" | "AUTOMATED" | "MANUAL";
  description?: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "AD_HOC" | "PER_TRANSACTION";
  controlOwnerUserId?: string | null;
  risksAddressed?: string;
  businessProcessIds: string[];
};

export async function createControl(input: ControlInput) {
  const created = await apiFetch<{ id: string }>("/ics/controls", { method: "POST", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateControl(id: string, input: Partial<ControlInput> & { active?: boolean }) {
  await apiFetch(`/ics/controls/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
}

export async function createControlTest(input: { controlId: string; plannedPeriod?: string; plannedDate?: string | null }) {
  const created = await apiFetch<{ id: string }>("/ics/control-tests", { method: "POST", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateControlTest(
  id: string,
  input: {
    plannedPeriod?: string;
    plannedDate?: string | null;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
    result?: "EFFECTIVE" | "DEFICIENT" | "NOT_TESTED" | null;
    resultNotes?: string;
  }
) {
  await apiFetch(`/ics/control-tests/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
}

export async function addControlTestEvidence(
  testId: string,
  file: { fileObjectKey: string; fileName: string; fileSize?: number; fileMime?: string }
) {
  await apiFetch(`/ics/control-tests/${testId}/evidence`, { method: "POST", body: JSON.stringify(file) });
  revalidatePath(REVALIDATE);
}

export type PolicyInput = {
  title: string;
  description?: string;
  documentType?: string;
  fileObjectKey?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  businessProcessIds: string[];
  controlIds: string[];
};

export async function createPolicyDocument(input: PolicyInput) {
  const created = await apiFetch<{ id: string }>("/ics/policies", { method: "POST", body: JSON.stringify(input) });
  revalidatePath(REVALIDATE);
  return created.id;
}
