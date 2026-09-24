import { apiFetch } from "@/lib/regstack/backend-client";

export type CalculationModel = "CSC" | "TESLA";

export type InstitutionSettings = {
  id: string;
  calculationModel: CalculationModel;
  cscMaterialityThreshold: number;
  cscImpactThreshold: number;
  teslaLogicAnd: boolean;
  teslaThreshold: number;
  groupRelief: boolean;
};

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  return apiFetch<InstitutionSettings>("/institutions/me");
}
