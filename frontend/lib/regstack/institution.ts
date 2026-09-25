import { apiFetch } from "@/lib/regstack/backend-client";

export type CalculationModel = "CSC" | "TESLA";

export type InstitutionSizeClass = "SEHR_KLEIN" | "KLEIN" | "MITTEL" | "GROSS";

export type InstitutionSettings = {
  id: string;
  sizeClass: InstitutionSizeClass;
  calculationModel: CalculationModel;
  cscMaterialityThreshold: number;
  cscImpactThreshold: number;
  teslaLogicAnd: boolean;
  teslaThreshold: number;
  groupRelief: boolean;
  revisionsbeauftragterName: string | null;
  revisionsbeauftragterIstGeschaeftsleiter: boolean;
};

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  return apiFetch<InstitutionSettings>("/institutions/me");
}
