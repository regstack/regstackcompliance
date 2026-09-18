"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import { getReport, listFeststellungen, listPruefungen, listUniversum } from "@/lib/regstack/revisions";

const REVALIDATE = "/interne-revision/jahresbericht";

export type JahresberichtRef = { pruefungId: string; feststellungId: string };
export type ResolvedJahrFinding = { id: string; titel: string; schweregrad: string | null; status: string };
export type ResolvedJahrAudit = {
  id: string; subject: string; reportDate: string | null; pruefungsobjektId: string;
  findings: ResolvedJahrFinding[];
};
export type ResolvedJahrCarryover = {
  feststellungId: string; pruefungId: string | null; subject: string; titel: string; schweregrad: string | null; status: string;
};
export type ResolvedJahrPlanItem = { id: string; bezeichnung: string; erledigt: boolean };
export type JahresberichtContent = {
  year: number;
  fromDate: string;
  toDate: string;
  auditIds: string[];
  carryoverRefs: JahresberichtRef[];
  plannedObjectIds: string[];
  planAdherence: string;
  gesamtaussage: string;
  resolvedAudits?: ResolvedJahrAudit[];
  resolvedCarryover?: ResolvedJahrCarryover[];
  resolvedPlan?: ResolvedJahrPlanItem[];
};

/** Zusammenfassende Jahresübersicht — AT 4.4.3 Tz. 9 verlangt ausdrücklich nur die mindestens
 * vierteljährliche Berichterstattung; eine eigenständige Jahresberichtspflicht bildet dieses
 * Modul nicht ab. Der Jahresbericht wird deshalb als Verdichtung der im System bereits erfassten
 * Daten geführt: Plan-Ist, durchgeführte Prüfungen, Feststellungsprofil, Altbestände. */
export async function generateJahresbericht(year: number): Promise<string> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [pruefungen, feststellungen, universum] = await Promise.all([listPruefungen(), listFeststellungen(), listUniversum()]);

  const auditIds = pruefungen
    .filter((p) => {
      const d = p.report_date ?? p.period_to;
      return d !== null && d >= from && d <= to;
    })
    .map((p) => p.id);

  const carryoverRefs: JahresberichtRef[] = feststellungen
    .filter((f) => f.status !== "geschlossen" && f.schweregrad !== "geringfuegig" && f.pruefung_id && !auditIds.includes(f.pruefung_id))
    .map((f) => ({ pruefungId: f.pruefung_id as string, feststellungId: f.id }));

  const plannedObjectIds = universum.filter((u) => u.plan_year === year).map((u) => u.id);

  const content: JahresberichtContent = {
    year, fromDate: from, toDate: to, auditIds, carryoverRefs, plannedObjectIds, planAdherence: "", gesamtaussage: "",
  };

  const created = await apiFetch<{ id: string }>("/revisions/reports", {
    method: "POST",
    body: JSON.stringify({
      reportType: "jahresbericht",
      periodFrom: new Date(from).toISOString(),
      periodTo: new Date(to).toISOString(),
      content,
    }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateJahresberichtText(id: string, fields: { planAdherence?: string; gesamtaussage?: string }) {
  const current = await getReport(id);
  if (current.status !== "entwurf") throw new Error("Nur Entwürfe können bearbeitet werden.");
  const content = { ...(current.content as object), ...fields };
  await apiFetch(`/revisions/reports/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  revalidatePath(REVALIDATE);
}

/** Friert den Jahresbericht ein — dieselbe Semantik wie beim Quartalsbericht: die aufgelösten
 * Daten werden einmalig in content geschrieben, bevor status auf "final" wechselt. */
export async function finalizeJahresbericht(id: string) {
  const current = await getReport(id);
  if (current.status !== "entwurf") throw new Error("Nur Entwürfe können finalisiert werden.");
  const content = current.content as JahresberichtContent;

  const [pruefungen, feststellungen, universum] = await Promise.all([listPruefungen(), listFeststellungen(), listUniversum()]);

  const resolvedAudits: ResolvedJahrAudit[] = content.auditIds
    .map((auditId): ResolvedJahrAudit | null => {
      const p = pruefungen.find((x) => x.id === auditId);
      if (!p) return null;
      const findings = feststellungen
        .filter((f) => f.pruefung_id === auditId)
        .map((f) => ({ id: f.id, titel: f.titel, schweregrad: f.schweregrad, status: f.status }));
      return { id: p.id, subject: p.subject, reportDate: p.report_date, pruefungsobjektId: p.pruefungsobjekt_id ?? "", findings };
    })
    .filter((a): a is ResolvedJahrAudit => a !== null);

  const resolvedCarryover: ResolvedJahrCarryover[] = content.carryoverRefs
    .map((ref): ResolvedJahrCarryover | null => {
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
    .filter((c): c is ResolvedJahrCarryover => c !== null);

  const auditedObjectIds = new Set(pruefungen.map((p) => p.pruefungsobjekt_id));
  const resolvedPlan: ResolvedJahrPlanItem[] = content.plannedObjectIds
    .map((objId): ResolvedJahrPlanItem | null => {
      const u = universum.find((x) => x.id === objId);
      if (!u) return null;
      return { id: u.id, bezeichnung: u.bezeichnung, erledigt: auditedObjectIds.has(u.id) };
    })
    .filter((p): p is ResolvedJahrPlanItem => p !== null);

  const newContent: JahresberichtContent = { ...content, resolvedAudits, resolvedCarryover, resolvedPlan };
  await apiFetch(`/revisions/reports/${id}/finalize`, { method: "POST", body: JSON.stringify({ content: newContent }) });
  revalidatePath(REVALIDATE);
}

export async function ackJahresbericht(id: string) {
  await apiFetch(`/revisions/reports/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}
