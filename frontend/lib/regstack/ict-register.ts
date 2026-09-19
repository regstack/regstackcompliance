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
  dataCategories: string | null;
  hasSubcontracting: boolean;
  subcontractingNote: string | null;
  status: IctArrangementStatus;
};

export async function listIctProviders(): Promise<IctProvider[]> {
  return apiFetch<IctProvider[]>("/ict-register/providers");
}

export async function listIctArrangements(): Promise<IctArrangement[]> {
  return apiFetch<IctArrangement[]>("/ict-register/arrangements");
}
