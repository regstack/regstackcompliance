import { apiFetch } from "@/lib/regstack/backend-client";

export type NachweisModule = "OUTSOURCING" | "COMPLIANCE" | "INTERNAL_AUDIT" | "RISK_MANAGEMENT" | "IT_RISK";

export type Nachweis = {
  id: string;
  module: NachweisModule;
  entityType: string;
  entityId: string | null;
  dateiname: string;
  fileRef: string | null;
  fileSize: number | null;
  fileMime: string | null;
  hash: string | null;
  aufbewahrungsfrist: string | null;
  previousVersionId: string | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
};

export async function listNachweise(params?: { module?: NachweisModule; entityType?: string; entityId?: string }) {
  const query = new URLSearchParams();
  if (params?.module) query.set("module", params.module);
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.entityId) query.set("entityId", params.entityId);
  const qs = query.toString();
  return apiFetch<Nachweis[]>(`/nachweise${qs ? `?${qs}` : ""}`);
}
