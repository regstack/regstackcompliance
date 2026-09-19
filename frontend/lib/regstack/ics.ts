import { apiFetch } from "@/lib/regstack/backend-client";

// Re-exported so existing Server Component imports from "@/lib/regstack/ics" keep working. Client
// Components must import types/labels/controlsDueForTesting from "@/lib/regstack/ics-utils"
// directly instead (see that file's header comment) — this module pulls in apiFetch, which
// depends on next/headers and cannot be bundled for the client.
export * from "@/lib/regstack/ics-utils";

import type { BusinessProcess, Control, ControlTest, PolicyDocument } from "@/lib/regstack/ics-utils";

export async function listBusinessProcesses(): Promise<BusinessProcess[]> {
  return apiFetch<BusinessProcess[]>("/ics/processes");
}
export async function getBusinessProcess(id: string): Promise<BusinessProcess> {
  return apiFetch<BusinessProcess>(`/ics/processes/${id}`);
}
export async function listControls(businessProcessId?: string): Promise<Control[]> {
  const qs = businessProcessId ? `?businessProcessId=${businessProcessId}` : "";
  return apiFetch<Control[]>(`/ics/controls${qs}`);
}
export async function getControl(id: string): Promise<Control> {
  return apiFetch<Control>(`/ics/controls/${id}`);
}
export async function listControlTests(controlId?: string): Promise<ControlTest[]> {
  const qs = controlId ? `?controlId=${controlId}` : "";
  return apiFetch<ControlTest[]>(`/ics/control-tests${qs}`);
}
export async function listPolicyDocuments(filter?: { businessProcessId?: string; controlId?: string }): Promise<PolicyDocument[]> {
  const params = new URLSearchParams();
  if (filter?.businessProcessId) params.set("businessProcessId", filter.businessProcessId);
  if (filter?.controlId) params.set("controlId", filter.controlId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<PolicyDocument[]>(`/ics/policies${qs}`);
}
