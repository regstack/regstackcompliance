// Tesla-FS-Modell — Kriterien für die Wesentlichkeitsanalyse bei Instituten mit
// calculationModel="TESLA". Ids und Zählung (5 Materialitäts-, 5 Basis- + 7 Deep-Dive-
// Anbieter-Risiko-Kriterien) spiegeln exakt src/modules/outsourcingActivities/criteria.ts
// (m1–m6 für Materialität wie im CSC-Modell, p1–p5/pd1–pd7 für den Anbieter-Risiko-Score),
// damit die Ratings hier 1:1 in die Backend-Klassifizierung (RiskAnalysis, classify.ts) einfließen.
import { RATING_OPTS, CRITICALITY_OPTS } from "@/lib/regstack/csc-criteria";

export { RATING_OPTS, CRITICALITY_OPTS };

export const PROVIDER_CRITERIA = [
  { id: "p1", label: "Wirtschaftliche und finanzielle Stabilität des Anbieters" },
  { id: "p2", label: "Konzentrationsrisiko (Marktanteil / Abhängigkeit weniger Anbieter)" },
  { id: "p3", label: "Länder- und Standortrisiko" },
  { id: "p4", label: "IKT-Sicherheits- und Zertifizierungsniveau" },
  { id: "p5", label: "Historie von Vorfällen / Leistungsstörungen" },
] as const;

export const PROVIDER_DEEP_CRITERIA = [
  { id: "pd1", label: "Erfüllungsgrad vereinbarter Service-Level (historisch)" },
  { id: "pd2", label: "Vorhandensein und Umfang einer Cyber-Versicherung" },
  { id: "pd3", label: "Nachweisliche Business-Continuity-Tests des Anbieters" },
  { id: "pd4", label: "Eigentümerstruktur / Konzentration auf wenige Anteilseigner" },
  { id: "pd5", label: "Aufsichtsrechtliche Sanktionen oder Verfahren gegen den Anbieter" },
  { id: "pd6", label: "Risiko aus Vierte-Parteien (Sub-Dienstleister des Anbieters)" },
  { id: "pd7", label: "Verhandlungsspielraum bei Vertragsanpassungen" },
] as const;

// Mirrors src/modules/outsourcingActivities/classify.ts's Tesla branch exactly (simple average,
// OR- or AND-verknüpft je nach institution.teslaLogicAnd) — a live client-side preview only. The
// server recomputes this authoritatively on every save (activities.routes.ts).
export function previewTeslaClassification(
  materialityRatings: Record<string, number>,
  providerRatings: Record<string, number>,
  quickTriggers: Record<string, boolean>,
  teslaThreshold = 3.0,
  teslaLogicAnd = false
) {
  const avg = (ratings: Record<string, number>, ids: readonly { id: string }[]) => {
    const vals = ids.map((c) => ratings[c.id]).filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const hardTrigger = Object.values(quickTriggers).some(Boolean);
  const materialityScore = avg(materialityRatings, [{ id: "m1" }, { id: "m2" }, { id: "m3" }, { id: "m4" }, { id: "m5" }, { id: "m6" }]);
  const providerScore = avg(providerRatings, [...PROVIDER_CRITERIA, ...PROVIDER_DEEP_CRITERIA]);
  const inherentScore = materialityScore !== null && providerScore !== null ? (materialityScore * providerScore) / 5 : null;

  const computedMaterial = hardTrigger
    ? true
    : materialityScore !== null && providerScore !== null
      ? teslaLogicAnd
        ? materialityScore >= teslaThreshold && providerScore >= teslaThreshold
        : materialityScore >= teslaThreshold || providerScore >= teslaThreshold
      : null;

  return { materialityScore, secondScore: providerScore, inherentScore, computedMaterial, hardTrigger };
}
