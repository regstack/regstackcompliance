// Pure, client-safe constants and helpers for the Prüfungsuniversum/Plan and Prüfungen part of
// the Revisions-Cockpit (AT 4.4.3, Tz. 4-7, 10). No "next/headers"/Supabase dependency — mirrors
// the boundary kept by revisions-utils.ts, so this file is safe to import from both Server and
// Client Components. Added as a NEW file instead of editing revisions.ts/revisions-utils.ts
// (which another engineer's code already imports): every read this module needs (listUniversum,
// getUniversumItem, listAuditPlans, listPruefungen, getPruefung, listPruefungZuweisungen,
// listPruefungsschritte, listArbeitspapiere, listArbeitspapiereForPruefung, listNachweiseFor,
// listAllPersons, listSperrfristen) already exists there, so this file only holds the reference
// option lists and QS-checklist template from the port brief plus a few small pure helpers.

export const CATEGORY_OPTS: { v: string; label: string }[] = [
  { v: "geschaeftsorganisation", label: "Ordnungsmäßigkeit der Geschäftsorganisation (allgemein)" },
  { v: "risikomanagement", label: "Risikomanagement, inkl. wirksame Umsetzung der Risikostrategie" },
  { v: "iks", label: "Internes Kontrollsystem" },
  { v: "sonstige", label: "Sonstige Aktivität / sonstiger Prozess" },
];

export const MATERIALITY_OPTS: { v: string; l: string }[] = [
  { v: "wesentlich", l: "Wesentliche Aktivität/Prozess" },
  { v: "nicht_wesentlich", l: "Nicht wesentliche Aktivität/Prozess" },
];

export const RATING_OPTS: { v: number | ""; l: string }[] = [
  { v: "", l: "–" },
  { v: 1, l: "1 – sehr gering" },
  { v: 2, l: "2 – gering" },
  { v: 3, l: "3 – mittel" },
  { v: 4, l: "4 – hoch" },
  { v: 5, l: "5 – sehr hoch" },
];

export const AUDIT_STATUS_OPTS: { v: string; l: string }[] = [
  { v: "geplant", l: "geplant" },
  { v: "laufend", l: "laufend" },
  { v: "abgeschlossen", l: "abgeschlossen" },
];

export const DURCHFUEHRUNG_OPTS: { v: string; l: string }[] = [
  { v: "intern", l: "intern durchgeführt" },
  { v: "ausgelagert", l: "ausgelagert (AT 9 (10))" },
  { v: "gemischt", l: "gemischt" },
];

export const ASSIGN_ROLES: { v: "leitung" | "pruefer" | "reviewer"; l: string }[] = [
  { v: "leitung", l: "Prüfungsleitung" },
  { v: "pruefer", l: "Prüfer/in" },
  { v: "reviewer", l: "Reviewer/in" },
];

export const PRUEFUNGSHANDLUNG: string[] = [
  "Dokumenteneinsicht", "Befragung/Interview", "Beobachtung", "Nachvollzug (Re-Performance)",
  "Stichprobenprüfung", "Vollerhebung", "Analyse/Auswertung", "Abgleich/Benchmarking", "Bestätigung Dritter",
];

export const AP_TYP: string[] = [
  "Prüfungsnotiz", "Gesprächsnotiz", "Dokumentenauszug", "Datenauswertung", "Stichprobendokumentation",
  "Systemnachweis/Screenshot", "Schriftverkehr", "Bestätigung",
];

export const AUSWAHLVERFAHREN: string[] = ["Zufallsauswahl", "bewusste Auswahl", "risikoorientierte Auswahl", "Vollerhebung"];

export const SCHRITT_BEURTEILUNG_OPTS: { v: string; l: string }[] = [
  { v: "", l: "—" },
  { v: "ok", l: "keine Beanstandung" },
  { v: "feststellung", l: "Feststellung" },
  { v: "nicht_pruefbar", l: "nicht abschließend beurteilbar" },
];

export const AP_REVIEW_OPTS: { v: string; l: string }[] = [
  { v: "in_arbeit", l: "in Arbeit" },
  { v: "vorgelegt", l: "zur Prüfung vorgelegt" },
  { v: "freigegeben", l: "freigegeben" },
  { v: "nachbesserung", l: "Nachbesserung erforderlich" },
];

export const QS_STATUS_OPTS: { v: string; l: string }[] = [
  { v: "offen", l: "offen" },
  { v: "erfuellt", l: "erfüllt" },
  { v: "teilweise", l: "teilweise erfüllt" },
  { v: "nicht_erfuellt", l: "nicht erfüllt" },
  { v: "na", l: "nicht anwendbar" },
];

export type QsChecklistItem = {
  id: string;
  punkt: string;
  tz: string;
  status: "offen" | "erfuellt" | "teilweise" | "nicht_erfuellt" | "na";
  kommentar: string;
};

const QS_CHECKLIST_TEMPLATE: { punkt: string; tz: string }[] = [
  { punkt: "Prüfungsauftrag und Prüfungsziel dokumentiert", tz: "Tz. 7" },
  { punkt: "Prüferzuweisung frei von Selbstprüfung und Sperrfristverstoß", tz: "Tz. 4" },
  { punkt: "Arbeitsprogramm vor Prüfungsbeginn erstellt und freigegeben", tz: "Tz. 6" },
  { punkt: "Stichprobenauswahl dokumentiert und begründet", tz: "Tz. 10" },
  { punkt: "Arbeitspapiere vollständig und nachvollziehbar (Wiederholbarkeit)", tz: "Tz. 10" },
  { punkt: "Alle Arbeitspapiere durch eine zweite Person freigegeben", tz: "Tz. 10" },
  { punkt: "Feststellungen mit Maßnahme, Verantwortlichem und Frist versehen", tz: "Tz. 7" },
  { punkt: "Schweregrad je Feststellung begründet zugeordnet", tz: "Tz. 7" },
  { punkt: "Stellungnahme des geprüften Bereichs eingeholt", tz: "Tz. 7" },
  { punkt: "Bericht zeitnah erstellt und der Geschäftsleitung vorgelegt", tz: "Tz. 7" },
  { punkt: "Aufbewahrungsfrist der Arbeitsunterlagen gesetzt", tz: "Tz. 10" },
];

export function freshQsChecklist(): QsChecklistItem[] {
  return QS_CHECKLIST_TEMPLATE.map((t) => ({ ...t, id: crypto.randomUUID(), status: "offen" as const, kommentar: "" }));
}

/** Tz. 10 — Stichprobendokumentation: Grundgesamtheit, Auswahlverfahren, Umfang, Begründung und
 * Einzelergebnisse gehören in die Akte, sonst ist die Stichprobe behauptet statt nachvollziehbar. */
export type Stichprobe = {
  aktiv: boolean;
  grundgesamtheitBeschreibung: string;
  grundgesamtheitUmfang: number | null;
  quelle: string;
  verfahren: string;
  stichprobenumfang: number | null;
  begruendung: string;
  ersatzauswahl: string;
  einzelergebnisse: string;
};

export const EMPTY_STICHPROBE: Stichprobe = {
  aktiv: false,
  grundgesamtheitBeschreibung: "",
  grundgesamtheitUmfang: null,
  quelle: "",
  verfahren: AUSWAHLVERFAHREN[0],
  stichprobenumfang: null,
  begruendung: "",
  ersatzauswahl: "",
  einzelergebnisse: "",
};

/** M3 — Einsichtnahme in die Arbeitspapiere eines externen Dienstleisters (Rückfallebene,
 * wenn die Arbeitspapiere nicht direkt in dieser Akte geführt werden). */
export type ExternEinsichtEntry = { id: string; datum: string; durch: string; ergebnis: string };

/** Vier-Augen-Prinzip auf Arbeitspapierebene: der Reviewer darf nicht der Ersteller sein. */
export function paperSelfReview(reviewerPersonId: string | null, erstellerPersonId: string | null): boolean {
  return !!(reviewerPersonId && erstellerPersonId && reviewerPersonId === erstellerPersonId);
}

export type PaperIssueInput = { reviewer_person_id: string | null; ersteller_person_id: string | null; review_status: string };

/** Aggregierte Arbeitspapier-Kennzahlen je Prüfung — Grundlage für die "nicht freigegeben"- und
 * "Vier-Augen verletzt"-Banner auf der Prüfungsdetailseite. */
export function paperIssues(papers: PaperIssueInput[]) {
  return {
    total: papers.length,
    open: papers.filter((p) => p.review_status !== "freigegeben").length,
    selfReview: papers.filter((p) => paperSelfReview(p.reviewer_person_id, p.ersteller_person_id)).length,
  };
}

/** Tz. 10 — eine Prüfung, die als abgeschlossen markiert ist, deren Arbeitspapiere aber nicht
 * vollständig freigegeben sind, hat die Nachvollziehbarkeit nicht belegt, nur behauptet. */
export function auditCloseBlocked(status: string, issues: { open: number; selfReview: number }): boolean {
  return status === "abgeschlossen" && (issues.open > 0 || issues.selfReview > 0);
}

/** Tz. 4 — Warnung, keine harte Sperre: eine Person mit noch laufender Sperrfrist und ohne
 * dokumentierte Abweichung sollte nicht auf eine Prüfung im gesperrten Bereich angesetzt werden. */
export type Sperrfrist = { person_id: string | null; bar_end_date: string | null; barred_areas: string | null; deviation: boolean };

export function activeBar(personId: string, sperrfristen: Sperrfrist[], today: string): Sperrfrist | null {
  return sperrfristen.find((s) => s.person_id === personId && !s.deviation && !!s.bar_end_date && (s.bar_end_date as string) > today) ?? null;
}

export function addMonths(dstr: string | null | undefined, m: number): string {
  if (!dstr) return "";
  const d = new Date(dstr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
}

/** Tz. 6 S.3 — Fälligkeit der nächsten Überprüfung der Risikobewertung eines Prüfungsobjekts. */
export function riskReviewDue(reviewDate: string | null, intervalMonate: number, today: string): boolean {
  if (!reviewDate) return true;
  return addMonths(reviewDate, intervalMonate) < today;
}
