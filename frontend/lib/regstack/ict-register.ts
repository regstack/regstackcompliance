import { apiFetch } from "@/lib/regstack/backend-client";

export type IctProviderType = "DIREKT" | "KONZERNINTERN";
export type IctArrangementStatus = "AKTIV" | "BEENDET";

export type IctProvider = {
  id: string;
  name: string;
  legalEntityIdentifier: string | null;
  country: string | null;
  providerType: IctProviderType;
  parentUndertaking: string | null;
};

export type IctArrangement = {
  id: string;
  providerId: string;
  provider: IctProvider;
  functionDescription: string;
  supportsCriticalFunction: boolean;
  criticalityReason: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  terminationNoticeMonths: number | null;
  annualCostEur: number | null;
  exitStrategyNote: string | null;
  dataCategories: string | null;
  hasSubcontracting: boolean;
  subcontractingNote: string | null;
  status: IctArrangementStatus;
};

// ITS-Ebene 4/6 (Durchführungsverordnung (EU) 2024/2956) — additiv zu IctArrangement: mehrere
// IKT-Dienstleistungen je Vertrag und die strukturierte Weiterverlagerungskette.
export type IctService = {
  id: string;
  arrangementId: string;
  serviceDescription: string;
  serviceLevelObjective: string | null;
};

export type IctSubcontractingStatus = "AKTIV" | "ENTFERNT";

export type IctSubcontracting = {
  id: string;
  arrangementId: string;
  parentId: string | null;
  level: number;
  provider: string;
  country: string | null;
  description: string | null;
  status: IctSubcontractingStatus;
};

export async function listIctProviders(): Promise<IctProvider[]> {
  return apiFetch<IctProvider[]>("/ict-register/providers");
}

export async function listIctArrangements(): Promise<IctArrangement[]> {
  return apiFetch<IctArrangement[]>("/ict-register/arrangements");
}

export async function listIctServices(arrangementId: string): Promise<IctService[]> {
  return apiFetch<IctService[]>(`/ict-register/arrangements/${arrangementId}/services`);
}

export async function listIctSubcontracting(arrangementId: string): Promise<IctSubcontracting[]> {
  return apiFetch<IctSubcontracting[]>(`/ict-register/arrangements/${arrangementId}/subcontracting`);
}
