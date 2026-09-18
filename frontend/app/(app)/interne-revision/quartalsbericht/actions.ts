"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import { getReport, listFeststellungen, listPruefungen } from "@/lib/regstack/revisions";
import { quarterRange } from "@/lib/regstack/revisions-utils";

const REVALIDATE = "/interne-revision/quartalsbericht";

export type QuartalsberichtRef = { pruefungId: string; feststellungId: string };
export type ResolvedQuartalFinding = { id: string; titel: string; schweregrad: string | null; status: string };
export type ResolvedQuartalAudit = {
  id: string; subject: string; reportDate: string | null; presentedTo: string | null;
  findings: ResolvedQuartalFinding[];
};
export type ResolvedQuartalCarryover = {
  feststellungId: string; pruefungId: string | null; subject: string; titel: string; schweregrad: string | null; status: string;
};
export type QuartalsberichtContent = {
  fromDate: string;
  toDate: string;
  auditIds: string[];
  carryoverRefs: QuartalsberichtRef[];
  planAdherence: string;
  resolvedAudits?: ResolvedQuartalAudit[];
  resolvedCarryover?: ResolvedQuartalCarryover[];
};

/** Tz. 9 — mindestens vierteljährlicher Bericht. Listet alle im Quartal durchgeführten Prüfungen
 * (auch mit null Feststellungen — das ist ein valides gutes Ergebnis) sowie jede noch offene
 * wesentliche Feststellung aus Prüfungen, die NICHT im Quartal liegen (Altbestand). Es werden nur
 * leichte Referenzen gespeichert (auditIds/carryoverRefs) — die Anzeige löst sie live auf, solange
 * der Bericht Entwurf ist; erst finalizeQuartalsbericht friert die aufgelösten Daten ein. */
export async function generateQuartalsbericht(year: number, quarter: number): Promise<string> {
  const { from, to } = quarterRange(year, quarter);
  const [pruefungen, feststellungen] = await Promise.all([listPruefungen(), listFeststellungen()]);

  const auditIds = pruefungen
    .filter((p) => {
      const d = p.report_date ?? p.period_to;
      return d !== null && d >= from && d <= to;
    })
    .map((p) => p.id);

  const carryoverRefs: QuartalsberichtRef[] = feststellungen
    .filter((f) => f.status !== "geschlossen" && f.schweregrad !== "geringfuegig" && f.pruefung_id && !auditIds.includes(f.pruefung_id))
    .map((f) => ({ pruefungId: f.pruefung_id as string, feststellungId: f.id }));

  const content: QuartalsberichtContent = { fromDate: from, toDate: to, auditIds, carryoverRefs, planAdherence: "" };

  const created = await apiFetch<{ id: string }>("/revisions/reports", {
    method: "POST",
    body: JSON.stringify({
      reportType: "quartalsbericht",
      periodFrom: new Date(from).toISOString(),
      periodTo: new Date(to).toISOString(),
      content,
    }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateQuartalsberichtPlanAdherence(id: string, planAdherence: string) {
  const current = await getReport(id);
  if (current.status !== "entwurf") throw new Error("Nur Entwürfe können bearbeitet werden.");
  const content = { ...(current.content as object), planAdherence };
  await apiFetch(`/revisions/reports/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  revalidatePath(REVALIDATE);
}

/** Friert den Bericht ein: löst auditIds/carryoverRefs ein letztes Mal gegen die aktuellen Daten
 * auf und schreibt die vollständig aufgelösten Arrays in content, BEVOR status auf "final"
 * gesetzt wird — spätere Änderungen an Feststellungen wirken sich dann nicht mehr rückwirkend
 * auf den bereits vorgelegten Bericht aus. */
export async function finalizeQuartalsbericht(id: string) {
  const current = await getReport(id);
  if (current.status !== "entwurf") throw new Error("Nur Entwürfe können finalisiert werden.");
  const content = current.content as QuartalsberichtContent;

  const [pruefungen, feststellungen] = await Promise.all([listPruefungen(), listFeststellungen()]);

  const resolvedAudits: ResolvedQuartalAudit[] = content.auditIds
    .map((auditId): ResolvedQuartalAudit | null => {
      const p = pruefungen.find((x) => x.id === auditId);
      if (!p) return null;
      const findings = feststellungen
        .filter((f) => f.pruefung_id === auditId)
        .map((f) => ({ id: f.id, titel: f.titel, schweregrad: f.schweregrad, status: f.status }));
      return { id: p.id, subject: p.subject, reportDate: p.report_date, presentedTo: p.presented_to, findings };
    })
    .filter((a): a is ResolvedQuartalAudit => a !== null);

  const resolvedCarryover: ResolvedQuartalCarryover[] = content.carryoverRefs
    .map((ref): ResolvedQuartalCarryover | null => {
      const f = feststellungen.find((x) => x.id === ref.feststellungId);
      if (!f) return null;
      return {
        feststellungId: f.id,
        pruefungId: ref.pruefungId,
        subject: f.pruefung?.subject ?? f.pruefungsobjekt?.bezeichnung ?? "—",
        titel: f.titel,
        schweregrad: f.schweregrad,
        status: f.status,
      };
    })
    .filter((c): c is ResolvedQuartalCarryover => c !== null);

  const newContent: QuartalsberichtContent = { ...content, resolvedAudits, resolvedCarryover };
  await apiFetch(`/revisions/reports/${id}/finalize`, { method: "POST", body: JSON.stringify({ content: newContent }) });
  revalidatePath(REVALIDATE);
}

/** Kenntnisnahme durch die Geschäftsleitung — erster Bestätiger gewinnt, erneutes Bestätigen ist
 * ein No-Op (enforced backend-side). */
export async function ackQuartalsbericht(id: string) {
  await apiFetch(`/revisions/reports/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}
