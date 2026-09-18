// Pure, server/client-agnostic helpers for the Compliance module — deliberately kept free of
// any "next/headers"-dependent import (unlike lib/regstack/compliance.ts) so Client Components
// can import from here directly without pulling a server-only module into the browser bundle.

// Turnus is free text (as entered by Compliance) — mapped to a month interval only for the
// "next due" calculation. Unrecognized values fall back to no computed due date rather than
// guessing.
const TURNUS_MONTHS: Record<string, number> = {
  monatlich: 1,
  quartalsweise: 3,
  halbjaehrlich: 6,
  "halbjährlich": 6,
  jaehrlich: 12,
  "jährlich": 12,
};

export function naechsteFaelligkeit(letzteDurchsicht: string | null, turnus: string | null): string | null {
  if (!letzteDurchsicht || !turnus) return null;
  const months = TURNUS_MONTHS[turnus.toLowerCase()];
  if (!months) return null;
  const d = new Date(letzteDurchsicht);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function isOverdue(nextDue: string | null): boolean {
  if (!nextDue) return false;
  return nextDue < new Date().toISOString().slice(0, 10);
}

export function toNameMap(persons: { id: string; full_name: string }[]): Map<string, string> {
  return new Map(persons.map((p) => [p.id, p.full_name]));
}

export type ReportContent = {
  name?: string; rating?: string; defizite?: string; gegenmassnahmen?: string;
  weiterleitung_revision?: string;
};

/** reports.content is a generic Json column (shared across modules) — narrow it to the
 * compliance quarterly-report shape here so both the Server Component page and the Client
 * Component table read it the same way. */
export function asContent(content: unknown): ReportContent {
  return (content && typeof content === "object" ? content : {}) as ReportContent;
}

export function risksWithoutControl<T extends { id: string }>(
  risiken: T[],
  risikoKontrollen: { risiko_id: string }[]
): T[] {
  const covered = new Set(risikoKontrollen.map((rk) => rk.risiko_id));
  return risiken.filter((r) => !covered.has(r.id));
}

export function normsWithoutControl<T extends { id: string }>(
  normen: T[],
  kontrollen: { norm_id: string | null }[],
  normRisiken: { norm_id: string; risiko_id: string }[],
  risikoKontrollen: { risiko_id: string }[]
): T[] {
  const directlyControlled = new Set(kontrollen.map((k) => k.norm_id).filter(Boolean));
  const controlledRiskIds = new Set(risikoKontrollen.map((rk) => rk.risiko_id));
  const viaRisk = new Set(
    normRisiken.filter((nr) => controlledRiskIds.has(nr.risiko_id)).map((nr) => nr.norm_id)
  );
  return normen.filter((n) => !directlyControlled.has(n.id) && !viaRisk.has(n.id));
}

export function controlsWithoutOwner<T extends { verantwortlich_person_id: string | null }>(kontrollen: T[]): T[] {
  return kontrollen.filter((k) => !k.verantwortlich_person_id);
}

/** Governance-Warnungen (Tz. 3-4): unzulaessige Funktionskombination, Rollenhaeufung,
 * ueberfaellige Erleichterungs-/Stellenbeschreibungs-Ueberpruefungen. */
export function governanceWarnings(
  beauftragte: { funktion: string; inhaber_person_id: string | null }[],
  erleichterungen: { ueberpruefung: string | null }[],
  stellenbeschreibungen: { naechste_ueberpruefung: string | null }[]
) {
  const warnings: string[] = [];
  const byPerson = new Map<string, string[]>();
  beauftragte.forEach((b) => {
    if (!b.inhaber_person_id) return;
    const list = byPerson.get(b.inhaber_person_id) ?? [];
    list.push(b.funktion);
    byPerson.set(b.inhaber_person_id, list);
  });
  byPerson.forEach((funktionen) => {
    if (funktionen.includes("Geldwaeschebeauftragte") && funktionen.includes("Datenschutzbeauftragter")) {
      warnings.push("Unzulässige Kombination Geldwäschebeauftragte × Datenschutzbeauftragter");
    }
    if (funktionen.length >= 4) {
      warnings.push(`Rollenhäufung: ${funktionen.length} Funktionen auf einer Person`);
    }
  });
  const overdueRel = erleichterungen.filter((e) => isOverdue(e.ueberpruefung)).length;
  if (overdueRel) warnings.push(`${overdueRel}× Erleichterung überprüfungsfällig`);
  const overdueJd = stellenbeschreibungen.filter((j) => isOverdue(j.naechste_ueberpruefung)).length;
  if (overdueJd) warnings.push(`${overdueJd}× Stellenbeschreibung überprüfungsfällig`);
  return warnings;
}
