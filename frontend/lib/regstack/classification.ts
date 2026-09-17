// Wesentlichkeitsanalyse (AT 9 Tz. 1-6) and Handlungsoption (Tz. 6) domain logic.
//
// `auslagerungen` has no dedicated column per rating/trigger/override field — only
// `risikokriterien` (jsonb) and `exit_strategie` (jsonb) exist for this. This module packs
// the full classification cluster into `risikokriterien` and the handlungsoption cluster into
// `exit_strategie`, so nothing entered here is lost even though the fields aren't individually
// queryable. `wesentlichkeit` / `wesentlichkeit_begruendung` (real columns) are kept as a
// derived mirror of the classification so the register list and RLS-facing views stay useful.
import type { Json } from "@/lib/database.types";

export const CATEGORY_LIST = [
  "IT-Infrastruktur & Cloud",
  "Zahlungsverkehr",
  "Leasing-Kernsystem / Vertragsverwaltung",
  "HR & Personalabrechnung",
  "Recht & Compliance-Beratung",
  "Kunden-Identifizierung & AML-Screening",
  "Interne Revision",
  "Treasury / Finanzbuchhaltung",
  "Sonstige Verwaltungsdienste",
] as const;

export const QUICK_TRIGGERS = [
  { id: "t1", label: "Verarbeitung des Leasing- oder Factoring-Kernsystems (Vertrags- und Bestandsführung, Subledger)", ref: "AT 9 Tz. 4/5; EBA/GL 29(a)" },
  { id: "t2", label: "Zahlungsdienst mit Verfügung über Kundengelder", ref: "EBA/GL 29(b); ZAG" },
  { id: "t3", label: "Übermittlung personenbezogener Kundendaten in ein Drittland ohne Angemessenheitsbeschluss", ref: "EBA/GL 66(d); Art. 44 ff. DSGVO" },
  { id: "t4", label: "Weitere Verlagerung an Subunternehmer außerhalb des Konzerns (Sub-Auslagerung)", ref: "AT 9 Tz. 8/11" },
  { id: "t5", label: "Dienstleister ist einziger Anbieter am Markt / keine kurzfristige Ersetzbarkeit", ref: "EBA/GL 66(b)" },
  { id: "t6", label: "Vollständige oder teilweise Auslagerung von Risikocontrolling, Compliance, Interner Revision oder Kerngeschäftsbereichen", ref: "AT 9 Tz. 4/5 — besonders intensiv zu prüfen" },
] as const;

export const IMPACT_CRITERIA = [
  { id: "i1", label: "Auswirkung auf die Fortführung wesentlicher Geschäftsprozesse bei Ausfall", ref: "EBA/GL 66(a)" },
  { id: "i2", label: "Bedeutung für aufsichtsrechtliche Pflichten (Kapital, Meldewesen, Compliance)", ref: "EBA/GL 66(b)" },
  { id: "i3", label: "Umfang und Sensitivität der verarbeiteten Kunden- und Unternehmensdaten", ref: "EBA/GL 66(d)" },
  { id: "i4", label: "Zahl und Betroffenheit der Kunden bei einer Störung", ref: "EBA/GL 66(c)" },
  { id: "i5", label: "Reputationsrisiko bei öffentlich wahrnehmbaren Vorfällen", ref: "EBA/GL 66(c)/(g)" },
  { id: "i6", label: "Finanzielles Volumen und wirtschaftliche Tragweite der Auslagerung", ref: "EBA/GL 66(h)" },
  { id: "i7", label: "Aufwand einer kurzfristigen Rückabwicklung oder Neuvergabe", ref: "EBA/GL 66(b)/(e)" },
] as const;

export const DEPENDENCY_CRITERIA = [
  { id: "d1", label: "Ersetzbarkeit des Anbieters / verfügbare Marktalternativen", ref: "EBA/GL 65" },
  { id: "d2", label: "Wirtschaftliche und finanzielle Stabilität des Anbieters", ref: "EBA/GL 65(a)" },
  { id: "d3", label: "Länder- und Standortrisiko, inkl. Datenübermittlung in Drittstaaten", ref: "EBA/GL 65(f)" },
  { id: "d4", label: "Länge und Verzweigung der Weiterverlagerungskette", ref: "AT 9 Tz. 8/11" },
  { id: "d5", label: "Umstellungs- und Kündigungsrisiko bei Vertragsende", ref: "EBA/GL 65(c)" },
  { id: "d6", label: "IKT-Sicherheits- und Kontrollniveau des Anbieters", ref: "EBA/GL 65(g)" },
] as const;

export const HANDLUNGSOPTION_OPTS = [
  { v: "adopted_options", label: "① Handlungsoptionen verabschiedet", desc: "Konkrete, geprüfte Handlungsoptionen für den Störfall sind beschlossen." },
  { v: "exit_strategy", label: "② Ausstiegsstrategie festgelegt", desc: "Definierter Ausstiegs-/Transitionsplan mit Zeithorizont, regelmäßig getestet." },
  { v: "bcm_linked", label: "③ Notfallplanung (BCM) statt Handlungsoption", desc: "Keine Handlungsoption vorhanden — angemessen im Notfallkonzept berücksichtigt (Tz. 6 S.3)." },
] as const;

export const RATING_OPTS = [
  { v: "", l: "–" },
  { v: "1", l: "1 – sehr gering" },
  { v: "2", l: "2 – gering" },
  { v: "3", l: "3 – mittel" },
  { v: "4", l: "4 – hoch" },
  { v: "5", l: "5 – sehr hoch" },
] as const;

export const ERSETZBARKEIT_OPTS = ["leicht", "schwierig", "unmöglich"] as const;
export const ASSURANCE_TYPES = ["SOC 1 Type II", "SOC 2 Type II", "ISAE 3402", "Interner Prüfbericht", "Sonstiges", "Keiner vorhanden"] as const;

export type Ratings = Record<string, string>;
export type Triggers = Record<string, boolean>;

export type Classification = {
  ratings: Ratings;
  triggers: Triggers;
  criticality: { assessment: "" | "kritisch" | "nicht_kritisch"; reason: string };
  scenario: { performed: boolean; qualitative: boolean; notes: string };
  adHoc: { trigger: boolean; note: string };
  override: { active: boolean; material: boolean | null; critical: boolean | null; reason: string; approver: string; date: string };
  monitoring: {
    assuranceType: string; assuranceDate: string; bridgeCoverage: string; reviewer: string; reviewDate: string;
    materialChange: "nein" | "ja"; changeNote: string; kpiEnabled: boolean;
    kpis: { name: string; target: string; reached: string; comment: string }[];
  };
};

export type Handlungsoption = {
  status: "" | "adopted_options" | "exit_strategy" | "bcm_linked";
  altProvider: string; altTransition: string;
  strategyDescription: string; testDate: string;
  depApprover: string; depDate: string; depControls: string;
  ersetzbarkeit: "leicht" | "schwierig" | "unmöglich";
  transitionMonths: number; reviewDate: string;
};

export const emptyClassification = (): Classification => ({
  ratings: {}, triggers: {},
  criticality: { assessment: "", reason: "" },
  scenario: { performed: false, qualitative: true, notes: "" },
  adHoc: { trigger: false, note: "" },
  override: { active: false, material: null, critical: null, reason: "", approver: "", date: "" },
  monitoring: { assuranceType: "Keiner vorhanden", assuranceDate: "", bridgeCoverage: "", reviewer: "", reviewDate: "", materialChange: "nein", changeNote: "", kpiEnabled: false, kpis: [] },
});

export const emptyHandlungsoption = (): Handlungsoption => ({
  status: "", altProvider: "", altTransition: "",
  strategyDescription: "", testDate: "",
  depApprover: "", depDate: "", depControls: "",
  ersetzbarkeit: "schwierig", transitionMonths: 6, reviewDate: "",
});

export function parseClassification(raw: Json): Classification {
  const base = emptyClassification();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  return {
    ratings: (r.ratings as Ratings) ?? base.ratings,
    triggers: (r.triggers as Triggers) ?? base.triggers,
    criticality: { ...base.criticality, ...(r.criticality as object) },
    scenario: { ...base.scenario, ...(r.scenario as object) },
    adHoc: { ...base.adHoc, ...(r.adHoc as object) },
    override: { ...base.override, ...(r.override as object) },
    monitoring: { ...base.monitoring, ...(r.monitoring as object) },
  };
}

export function parseHandlungsoption(raw: Json): Handlungsoption {
  const base = emptyHandlungsoption();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  return { ...base, ...(raw as object) };
}

function avgRatings(ratings: Ratings, list: readonly { id: string }[]): number | null {
  let sum = 0, n = 0;
  for (const c of list) {
    const v = ratings[c.id];
    if (v !== undefined && v !== "") { sum += Number(v); n++; }
  }
  return n ? sum / n : null;
}

export type RiskTier = "none" | "Negligible" | "Low" | "Medium" | "Higher" | "Critical";
export function riskTier(score: number | null): RiskTier {
  if (score === null) return "none";
  if (score <= 1) return "Negligible";
  if (score <= 2) return "Low";
  if (score <= 3) return "Medium";
  if (score <= 4) return "Higher";
  return "Critical";
}
export const TIER_LABELS: Record<RiskTier, string> = {
  none: "–", Negligible: "Unbedeutend", Low: "Gering", Medium: "Mittel", Higher: "Erhöht", Critical: "Kritisch",
};

export type ClassificationResult = {
  impactScore: number | null; dependencyScore: number | null;
  inherent: number | null; tier: RiskTier;
  computedMaterial: boolean | null; criticalSuggestion: boolean | null; basis: string;
  finalMaterial: boolean | null; finalCritical: boolean | null;
  hardTrigger: boolean; triggeredBy: (typeof QUICK_TRIGGERS)[number][];
};

export const DEFAULT_THRESHOLDS = { impactThreshold: 3.0, dependencyThreshold: 3.0 };

export function classify(c: Classification, thresholds = DEFAULT_THRESHOLDS): ClassificationResult {
  const triggeredBy = QUICK_TRIGGERS.filter((t) => c.triggers[t.id]);
  const impactScore = avgRatings(c.ratings, IMPACT_CRITERIA);
  const dependencyScore = avgRatings(c.ratings, DEPENDENCY_CRITERIA);
  const inherent = impactScore !== null && dependencyScore !== null ? Math.round(((impactScore + dependencyScore) / 2) * 100) / 100 : null;
  const hardTrigger = triggeredBy.length > 0;

  let computedMaterial: boolean | null;
  let criticalSuggestion: boolean | null;
  let basis: string;
  if (hardTrigger) {
    computedMaterial = true; criticalSuggestion = true;
    basis = `Hard-Trigger im Quick-Check (${triggeredBy.map((t) => t.id).join(", ")})`;
  } else if (impactScore === null || dependencyScore === null) {
    computedMaterial = null; criticalSuggestion = null; basis = "Bewertung unvollständig";
  } else {
    computedMaterial = impactScore >= thresholds.impactThreshold || dependencyScore >= thresholds.dependencyThreshold;
    criticalSuggestion = computedMaterial && (impactScore >= 4 || dependencyScore >= 4);
    basis = `Auswirkungs-Score ≥ ${thresholds.impactThreshold.toFixed(2)} ODER Abhängigkeits-Score ≥ ${thresholds.dependencyThreshold.toFixed(2)}`;
  }

  const override = c.override;
  const finalMaterial = override?.active && override.material !== null ? override.material : computedMaterial;
  let finalCritical: boolean | null;
  if (override?.active && override.critical !== null) finalCritical = override.critical;
  else if (c.criticality.assessment === "kritisch") finalCritical = true;
  else if (c.criticality.assessment === "nicht_kritisch") finalCritical = false;
  else finalCritical = null;

  return { impactScore, dependencyScore, inherent, tier: riskTier(inherent), computedMaterial, criticalSuggestion, basis, finalMaterial, finalCritical, hardTrigger, triggeredBy };
}

export function classificationBegruendung(cl: ClassificationResult, c: Classification): string {
  const parts = [cl.basis];
  if (c.override.active && c.override.reason) parts.push(`Override: ${c.override.reason}`);
  return parts.join(" — ");
}
