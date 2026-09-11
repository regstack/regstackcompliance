// Server-side port of the classification engine from the Cockpit prototype (regstack_cockpit.html).
// Kept in lockstep with that artifact deliberately — the frontend prototype and this backend must
// classify identically, since the prototype is the reference UX the pilot customers already saw.

export type CalculationModel = "CSC" | "TESLA";

export interface InstitutionSettings {
  calculationModel: CalculationModel;
  cscMaterialityThreshold: number;
  cscImpactThreshold: number;
  teslaLogicAnd: boolean;
  teslaThreshold: number;
}

export interface ClassificationResult {
  materialityScore: number | null;
  secondScore: number | null;
  inherentScore: number | null;
  tier: "Negligible" | "Low" | "Medium" | "Higher" | "Critical" | "none";
  computedMaterial: boolean | null;
  criticalSuggestion: boolean | null;
  basis: string;
  hardTrigger: boolean;
}

function avg(ratings: Record<string, number>, ids: string[]): number | null {
  const vals = ids.map((id) => ratings[id]).filter((v) => v !== undefined && v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function riskTier(score: number | null): ClassificationResult["tier"] {
  if (score === null) return "none";
  if (score <= 1) return "Negligible";
  if (score <= 2) return "Low";
  if (score <= 3) return "Medium";
  if (score <= 4) return "Higher";
  return "Critical";
}

export function classify(
  materialityRatings: Record<string, number>,
  secondDimensionRatings: Record<string, number>,
  materialityCriteriaIds: string[],
  secondDimensionCriteriaIds: string[],
  quickTriggers: Record<string, boolean>,
  settings: InstitutionSettings
): ClassificationResult {
  const hardTrigger = Object.values(quickTriggers).some(Boolean);
  const materialityScore = avg(materialityRatings, materialityCriteriaIds);
  const secondScore = avg(secondDimensionRatings, secondDimensionCriteriaIds);

  let inherentScore: number | null = null;
  let computedMaterial: boolean | null;
  let criticalSuggestion: boolean | null;
  let basis: string;

  if (settings.calculationModel === "CSC") {
    inherentScore =
      materialityScore !== null && secondScore !== null
        ? Number(((materialityScore + secondScore) / 2).toFixed(2))
        : null;
    if (hardTrigger) {
      computedMaterial = true;
      criticalSuggestion = true;
      basis = "Hard-Trigger im Quick-Check";
    } else if (materialityScore === null || secondScore === null) {
      computedMaterial = null;
      criticalSuggestion = null;
      basis = "Bewertung unvollständig";
    } else {
      computedMaterial =
        materialityScore >= settings.cscMaterialityThreshold && secondScore >= settings.cscImpactThreshold;
      criticalSuggestion = computedMaterial && (materialityScore >= 4 || secondScore >= 4);
      basis = `CSC-Modell (Materialität ≥ ${settings.cscMaterialityThreshold} UND Umfassende Auswirkung ≥ ${settings.cscImpactThreshold})`;
    }
  } else {
    inherentScore =
      materialityScore !== null && secondScore !== null
        ? Number(((materialityScore * secondScore) / 5).toFixed(2))
        : null;
    if (hardTrigger) {
      computedMaterial = true;
      criticalSuggestion = true;
      basis = "Hard-Trigger im Quick-Check";
    } else if (materialityScore === null || secondScore === null) {
      computedMaterial = null;
      criticalSuggestion = null;
      basis = "Bewertung unvollständig";
    } else {
      computedMaterial = settings.teslaLogicAnd
        ? materialityScore >= settings.teslaThreshold && secondScore >= settings.teslaThreshold
        : materialityScore >= settings.teslaThreshold || secondScore >= settings.teslaThreshold;
      criticalSuggestion = computedMaterial && (materialityScore >= 4 || secondScore >= 4);
      basis = `Tesla-FS-Modell (${settings.teslaLogicAnd ? "UND" : "ODER"}-Verknüpfung, Schwelle ${settings.teslaThreshold})`;
    }
  }

  return {
    materialityScore,
    secondScore,
    inherentScore,
    tier: riskTier(inherentScore),
    computedMaterial,
    criticalSuggestion,
    basis,
    hardTrigger,
  };
}
