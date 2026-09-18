// Pure helpers for the Interne Revision cockpit (AT 4.4.3). No "next/headers" dependency —
// safe to import from both Server and Client Components. Field names match the DB columns
// (snake_case); jsonb sub-object keys keep the camelCase shape used throughout escalation/
// exec_escalation/stellungnahme/abschluss so the original MaRisk cross-references stay intact.

export type Schweregrad = "besonders_schwerwiegend" | "schwerwiegend" | "wesentlich" | "geringfuegig";

export const SEVERITY_ORDER: Schweregrad[] = ["besonders_schwerwiegend", "schwerwiegend", "wesentlich", "geringfuegig"];

export const SEVERITY_DEFAULT: Record<Schweregrad, { label: string; desc: string }> = {
  besonders_schwerwiegend: {
    label: "Besonders schwerwiegend",
    desc: "Höchste Risikorelevanz — unverzügliche Berichterstattung an die Geschäftsleitung erforderlich, unabhängig vom Quartalsturnus (Tz. 9 S.2).",
  },
  schwerwiegend: {
    label: "Schwerwiegend",
    desc: "Erhöhte Risikorelevanz — besondere Herausstellung im Prüfungsbericht; bei Richtung gegen einen Geschäftsleiter greift die Eskalation nach Tz. 8.",
  },
  wesentlich: {
    label: "Wesentlich",
    desc: "Risikorelevanter Mangel — Aufnahme in den vierteljährlichen Bericht (Tz. 9) und Nachverfolgung der Beseitigung (Tz. 11/12) bis zur Erledigung.",
  },
  geringfuegig: {
    label: "Geringe Risikorelevanz",
    desc: "Institutseigene Kategorie für Mängel ohne wesentliche Risikorelevanz (Tz. 7, „Abstufung der Mängel“) — eigene Kriterien, keine Pflicht zur Eskalationskette.",
  },
};

export type SeveritySettings = Partial<Record<Schweregrad, { label?: string; desc?: string }>>;

export function severityLabel(severity: string | null, settings?: SeveritySettings | null): string {
  if (!severity) return "—";
  const key = severity as Schweregrad;
  return settings?.[key]?.label || SEVERITY_DEFAULT[key]?.label || severity;
}

export const SEVERITY_PILL: Record<Schweregrad, string> = {
  besonders_schwerwiegend: "danger",
  schwerwiegend: "danger",
  wesentlich: "warning",
  geringfuegig: "open",
};

export const OVERALL_RATING: { v: string; l: string; pill: "open" | "success" | "accent" | "warning" | "danger"; desc: string }[] = [
  { v: "", l: "— noch kein Gesamturteil", pill: "open", desc: "" },
  { v: "gut", l: "Gut", pill: "success", desc: "Keine Beanstandungen hinsichtlich der aufbau-/ablauforganisatorischen Anforderungen sowie der gesetzlichen und aufsichtsrechtlichen Vorgaben." },
  { v: "befriedigend", l: "Befriedigend", pill: "accent", desc: "Kontroll- und Prozessrisiken wurden festgestellt; die Umsetzung von Kontrollmaßnahmen ist erforderlich." },
  { v: "verbesserungsbeduerftig", l: "Verbesserungsbedürftig", pill: "warning", desc: "Wesentliche Prozessrisiken und Kontrollschwächen wurden festgestellt; die unverzügliche Umsetzung von Kontrollmaßnahmen ist erforderlich." },
  { v: "unzureichend", l: "Unzureichend", pill: "danger", desc: "Der Prüfungsgegenstand weist Verstöße gegen gesetzliche oder aufsichtsrechtliche Vorgaben auf, die geeignet sind, Zweifel an der Eignung der Geschäftsleiter zu begründen." },
];
export function ratingMeta(v: string | null) {
  return OVERALL_RATING.find((o) => o.v === (v ?? "")) ?? OVERALL_RATING[0];
}

export const RISK_CRITERIA: { id: "potenzial" | "veraenderung" | "quellen" | "manipulation"; label: string }[] = [
  { id: "potenzial", label: "Risikopotenzial der Aktivität/des Prozesses" },
  { id: "veraenderung", label: "Mögliche Veränderungen der Aktivitäten/Prozesse seit letzter Prüfung" },
  { id: "quellen", label: "Vielfalt/Komplexität unterschiedlicher Risikoquellen" },
  { id: "manipulation", label: "Manipulationsanfälligkeit" },
];

export type Risikokriterien = Partial<Record<"potenzial" | "veraenderung" | "quellen" | "manipulation", number>>;

/** Tz. 6 S.2: vier gleichgewichtete 1–5 Kriterien, gemittelt zu einem Risikoscore. Nur
 * gültig (nicht null), wenn alle vier Kriterien bewertet sind. */
export function riskScore(risk: Risikokriterien | null | undefined): number | null {
  if (!risk) return null;
  let sum = 0;
  let n = 0;
  for (const c of RISK_CRITERIA) {
    const v = risk[c.id];
    if (v !== undefined && v !== null) {
      sum += Number(v);
      n++;
    }
  }
  return n === RISK_CRITERIA.length ? Math.round((sum / n) * 100) / 100 : null;
}

/** Tz. 6 S.5-7: Grundsatz 3 Jahre; kürzer bei besonderen Risiken; 5 Jahre nur für als
 * "nicht wesentlich" eingestufte Aktivitäten/Prozesse. */
export function cycleYears(materiality: string | null, risk: Risikokriterien | null | undefined): number {
  const s = riskScore(risk);
  if (s !== null && s >= 4.5) return 1;
  if (s !== null && s >= 3.5) return 2;
  if (materiality === "nicht_wesentlich") return 5;
  return 3;
}

export function addYears(dstr: string | null | undefined, y: number): string {
  if (!dstr) return today();
  const d = new Date(dstr);
  d.setFullYear(d.getFullYear() + y);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dstr: string | null | undefined): number | null {
  if (!dstr) return null;
  const d = new Date(dstr);
  const now = new Date(today());
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function nextDueDate(lastAuditDate: string | null, materiality: string | null, risk: Risikokriterien | null | undefined): string {
  if (!lastAuditDate) return today();
  return addYears(lastAuditDate, cycleYears(materiality, risk));
}

export type UniverseStatus = "never" | "overdue" | "due_soon" | "on_time";

export function universeStatus(lastAuditDate: string | null, materiality: string | null, risk: Risikokriterien | null | undefined): UniverseStatus {
  if (!lastAuditDate) return "never";
  const d = daysUntil(nextDueDate(lastAuditDate, materiality, risk));
  if (d !== null && d < 0) return "overdue";
  if (d !== null && d <= 180) return "due_soon";
  return "on_time";
}

export const UNIV_STATUS_LABEL: Record<UniverseStatus, string> = {
  never: "noch nie geprüft",
  overdue: "überfällig",
  due_soon: "bald fällig",
  on_time: "im Plan",
};
export const UNIV_STATUS_PILL: Record<UniverseStatus, "danger" | "warning" | "success"> = {
  never: "danger",
  overdue: "danger",
  due_soon: "warning",
  on_time: "success",
};

/** Kalenderquartale — Tz. 9 spricht vom "Berichtsquartal", nicht von einem rollierenden
 * 90-Tage-Fenster. */
export function quarterRange(year: number, q: number) {
  const from = new Date(Date.UTC(year, (q - 1) * 3, 1));
  const to = new Date(Date.UTC(year, (q - 1) * 3 + 3, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), label: `Q${q} ${year}` };
}
export function quarterIndex(dstr: string | null | undefined): number | null {
  if (!dstr) return null;
  const d = new Date(dstr);
  return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
}
export function currentQuarter() {
  const d = new Date(today());
  return { year: d.getUTCFullYear(), q: Math.floor(d.getUTCMonth() / 3) + 1 };
}

export type Escalation = { zustaendigeGlDate?: string | null; zustaendigeGlBy?: string | null; gesamteGlDate?: string | null; gesamteGlBy?: string | null };
export type ExecEscalation = { glDate?: string | null; glBy?: string | null; bafinDate?: string | null; bafinBy?: string | null; bundesbankDate?: string | null; bundesbankBy?: string | null };

export type FindingForStage = {
  status: string;
  abschluss_art?: string | null;
  schweregrad: string | null;
  escalation: Escalation | null;
  effective_due_date: string | null;
};

export type FindingStage =
  | "offen" | "eskalation_faellig" | "zustaendige_gl" | "gesamte_gl_faellig" | "gesamte_gl" | "erledigt" | "restrisiko";

/** Tz. 12: offen -> (überfällig über der institutseigenen "angemessenen Zeit") -> zuständige
 * GL-Mitglieder informiert -> (Quartalsgrenze überschritten, Mangel bleibt bestehen) -> gesamte
 * GL fällig -> gesamte GL informiert. Gilt ausdrücklich nur für WESENTLICHE Mängel. */
export function findingStage(f: FindingForStage, angemesseneZeitTage: number): FindingStage {
  if (f.status === "geschlossen" && f.abschluss_art === "restrisiko") return "restrisiko";
  if (f.status === "geschlossen") return "erledigt";
  if (f.schweregrad === "geringfuegig") return "offen";
  const esc = f.escalation ?? {};
  if (esc.gesamteGlDate) return "gesamte_gl";
  if (esc.zustaendigeGlDate) {
    return (quarterIndex(esc.zustaendigeGlDate) ?? 0) < (quarterIndex(today()) ?? 0) ? "gesamte_gl_faellig" : "zustaendige_gl";
  }
  const overdue = f.effective_due_date ? -(daysUntil(f.effective_due_date) ?? 0) : null;
  if (overdue !== null && overdue > angemesseneZeitTage) return "eskalation_faellig";
  return "offen";
}

export const STAGE_LABEL: Record<FindingStage, string> = {
  offen: "offen",
  eskalation_faellig: "Eskalation fällig (Tz. 12 S.1)",
  zustaendige_gl: "zuständige GL informiert",
  gesamte_gl_faellig: "gesamte GL zu informieren (Tz. 12 S.2)",
  gesamte_gl: "gesamte GL informiert",
  erledigt: "erledigt",
  restrisiko: "abgeschlossen mit Restrisiko",
};
export const STAGE_PILL: Record<FindingStage, "open" | "danger" | "warning" | "success" | "accent"> = {
  offen: "open",
  eskalation_faellig: "danger",
  zustaendige_gl: "warning",
  gesamte_gl_faellig: "danger",
  gesamte_gl: "warning",
  erledigt: "success",
  restrisiko: "accent",
};

/** Tz. 8: schwerwiegende/besonders schwerwiegende Feststellung gegen einen Geschäftsleiter ->
 * unverzügliche Berichterstattung + dessen Pflicht, BaFin/Bundesbank unverzüglich zu informieren. */
export function execEscalationRequired(executiveTarget: boolean, schweregrad: string | null): boolean {
  return executiveTarget && (schweregrad === "schwerwiegend" || schweregrad === "besonders_schwerwiegend");
}
export function execEscalationOpen(executiveTarget: boolean, schweregrad: string | null, exec: ExecEscalation | null): boolean {
  if (!execEscalationRequired(executiveTarget, schweregrad)) return false;
  const e = exec ?? {};
  return !(e.glDate && e.bafinDate && e.bundesbankDate);
}

export type Fristverlaengerung = { neu: string };

/** M5 — die ursprünglich zugesagte Frist wird nie überschrieben; jede Verlängerung ist ein
 * eigener Datensatz (revisionsfeststellung_fristverlaengerungen). */
export function effectiveDueDate(fristUrspruenglich: string | null, verlaengerungen: Fristverlaengerung[]): string | null {
  if (verlaengerungen.length) return verlaengerungen[verlaengerungen.length - 1].neu;
  return fristUrspruenglich;
}

export function retentionUntil(reportDate: string | null): string {
  return reportDate ? addYears(reportDate, 6) : "";
}

export function severityProfile(findings: { schweregrad: string | null; status: string }[]) {
  const prof: Record<string, { gesamt: number; offen: number }> = {};
  for (const k of SEVERITY_ORDER) prof[k] = { gesamt: 0, offen: 0 };
  for (const f of findings) {
    const key = f.schweregrad ?? "wesentlich";
    if (!prof[key]) prof[key] = { gesamt: 0, offen: 0 };
    prof[key].gesamt++;
    if (f.status !== "geschlossen") prof[key].offen++;
  }
  return prof;
}

export function fmtNum(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? "–" : n.toFixed(1);
}
