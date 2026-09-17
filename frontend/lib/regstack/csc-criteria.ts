// CSC-Modell (Cisco Systems Capital GmbH-Vorbild) — Kriterien für die Wesentlichkeitsanalyse.
// Ids und Zählung (6 Materialitäts-, 6 Auswirkungskriterien) spiegeln exakt
// src/modules/outsourcingActivities/criteria.ts (m1–m6, ei1–ei6), damit die Ratings hier 1:1 in
// die Backend-Klassifizierung (RiskAnalysis, classify.ts) einfließen.
//
// Die reale CSC-Methodik bewertet 10 Materialitäts- und 9 Auswirkungskategorien mit
// individuellen Gewichten auf einer 0–3-Skala (siehe RegStack_Vergleichsanalyse_CSC_TFS_MaRisk.docx).
// Das Backend führt bislang nur je 6 gleichgewichtete Kriterien auf einer 1–5-Skala — die Labels
// hier sind die sechs gewichtigsten der jeweils realen CSC-Kategorien; eine vollständige 10/9-
// Kategorien-Abbildung mit den echten Gewichten wäre ein eigener, größerer Schritt.
export const MATERIALITY_CRITERIA = [
  { id: "m1", label: "Qualifikation und Verlässlichkeit des Dienstleisters" },
  { id: "m2", label: "Organisatorische Einbindung in die Institutsprozesse" },
  { id: "m3", label: "Strategische Risiken" },
  { id: "m4", label: "Wirtschaftliche Risiken" },
  { id: "m5", label: "Operationelle Risiken" },
  { id: "m6", label: "Regulatorisches Risiko" },
] as const;

export const EXTENSIVE_IMPACT_CRITERIA = [
  { id: "ei1", label: "Regulatorische Auswirkung" },
  { id: "ei2", label: "Abhängigkeit / Lock-in-Risiko gegenüber dem Anbieter" },
  { id: "ei3", label: "Auswirkung einer Beendigung der Auslagerung" },
  { id: "ei4", label: "Auswirkung einer Weiterverlagerung durch den Anbieter" },
  { id: "ei5", label: "Verlust von institutsinternem Know-how" },
  { id: "ei6", label: "Auswirkung auf Kunden" },
] as const;

export const RATING_OPTS = [
  { v: "", l: "–" },
  { v: "1", l: "1 – sehr gering" },
  { v: "2", l: "2 – gering" },
  { v: "3", l: "3 – mittel" },
  { v: "4", l: "4 – hoch" },
  { v: "5", l: "5 – sehr hoch" },
] as const;

export const CRITICALITY_OPTS: { v: "OFFEN" | "KRITISCH" | "NICHT_KRITISCH"; l: string }[] = [
  { v: "OFFEN", l: "Offen" },
  { v: "KRITISCH", l: "Kritisch (AT 9 Tz. 4/5)" },
  { v: "NICHT_KRITISCH", l: "Nicht kritisch" },
];

// Mirrors src/modules/outsourcingActivities/classify.ts's CSC branch exactly (simple average,
// materialityScore >= cscMaterialityThreshold AND secondScore >= cscImpactThreshold) — a live
// client-side preview only. The server recomputes this authoritatively on every save
// (activities.routes.ts), so a stale or manipulated preview here can never persist.
export function previewCscClassification(
  materialityRatings: Record<string, number>,
  secondDimensionRatings: Record<string, number>,
  quickTriggers: Record<string, boolean>,
  cscMaterialityThreshold = 2.5,
  cscImpactThreshold = 2.75
) {
  const avg = (ratings: Record<string, number>, ids: readonly { id: string }[]) => {
    const vals = ids.map((c) => ratings[c.id]).filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const hardTrigger = Object.values(quickTriggers).some(Boolean);
  const materialityScore = avg(materialityRatings, MATERIALITY_CRITERIA);
  const secondScore = avg(secondDimensionRatings, EXTENSIVE_IMPACT_CRITERIA);
  const inherentScore = materialityScore !== null && secondScore !== null ? (materialityScore + secondScore) / 2 : null;

  const computedMaterial = hardTrigger
    ? true
    : materialityScore !== null && secondScore !== null
      ? materialityScore >= cscMaterialityThreshold && secondScore >= cscImpactThreshold
      : null;

  return { materialityScore, secondScore, inherentScore, computedMaterial, hardTrigger };
}
