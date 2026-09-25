import { apiFetch } from "@/lib/regstack/backend-client";

export type CalculationModel = "CSC" | "TESLA";
export type SizeClass = "SEHR_KLEIN" | "KLEIN" | "MITTEL" | "GROSS";

export const SIZE_CLASS_LABEL: Record<SizeClass, string> = {
  SEHR_KLEIN: "Sehr klein",
  KLEIN: "Klein",
  MITTEL: "Mittel",
  GROSS: "Groß",
};

// Full InstitutionProfile as returned by GET /institutions/me — kept in one place so every page
// that needs a subset (Wesentlichkeitsanalyse only needs calculationModel/thresholds, Institutsgröße
// needs sizeClass et al.) shares the same wire type instead of re-declaring it.
export type InstitutionSettings = {
  id: string;
  name: string;
  sizeClass: SizeClass;
  groupRelief: boolean;
  reviewCycleYears: number;
  calculationModel: CalculationModel;
  cscMaterialityThreshold: number;
  cscImpactThreshold: number;
  teslaLogicAnd: boolean;
  teslaThreshold: number;
  revisionsbeauftragterName: string | null;
  revisionsbeauftragterIstGeschaeftsleiter: boolean;
};

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  return apiFetch<InstitutionSettings>("/institutions/me");
}

export type InstitutionUpdateInput = Partial<{
  sizeClass: SizeClass;
  groupRelief: boolean;
  reviewCycleYears: number;
  calculationModel: CalculationModel;
  cscMaterialityThreshold: number;
  cscImpactThreshold: number;
  teslaLogicAnd: boolean;
  teslaThreshold: number;
  revisionsbeauftragterName: string | null;
  revisionsbeauftragterIstGeschaeftsleiter: boolean;
}>;

export async function updateInstitutionSettings(input: InstitutionUpdateInput): Promise<InstitutionSettings> {
  return apiFetch<InstitutionSettings>("/institutions/me", { method: "PATCH", body: JSON.stringify(input) });
}
