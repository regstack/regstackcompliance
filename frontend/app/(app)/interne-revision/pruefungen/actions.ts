"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import { freshQsChecklist, type QsChecklistItem, type Stichprobe, type ExternEinsichtEntry } from "@/lib/regstack/revisions-universum";

const detailPath = (id: string) => `/interne-revision/pruefungen/${id}`;
const LIST_PATH = "/interne-revision/pruefungen";

/* =====================================================================
 * Anlage einer Prüfung (aus dem Prüfungsuniversum oder direkt aus der Prüfungsliste)
 * ===================================================================*/

export type PruefungCreateInput = {
  pruefungsobjekt_id: string;
  subject: string;
  period_from: string | null;
  period_to: string | null;
};

export async function createPruefung(fields: PruefungCreateInput): Promise<string> {
  const created = await apiFetch<{ id: string }>("/revisions/pruefungen", {
    method: "POST",
    body: JSON.stringify({
      pruefungsobjektId: fields.pruefungsobjekt_id,
      subject: fields.subject,
      periodFrom: fields.period_from ? new Date(fields.period_from).toISOString() : null,
      periodTo: fields.period_to ? new Date(fields.period_to).toISOString() : null,
      qsChecklist: freshQsChecklist(),
    }),
  });
  revalidatePath(LIST_PATH);
  revalidatePath(`/interne-revision/pruefungsuniversum/${fields.pruefungsobjekt_id}`);
  return created.id;
}

/* =====================================================================
 * Berichtsangaben & Gesamturteil (Tz. 7)
 * ===================================================================*/

export type BerichtInput = {
  status: string;
  prepared_by: string | null;
  report_date: string | null;
  presented_to: string | null;
  presented_date: string | null;
  overall_rating: string | null;
  budget_days: number;
  actual_days: number;
  workpaper_ref: string | null;
};

// Status is split into its own PATCH .../status call, which is where the server-side
// "no closing with open/self-reviewed Arbeitspapiere" gate lives (see paper-checks.ts) — bundling
// it into the general field update would silently bypass that gate.
export async function updateBericht(id: string, fields: BerichtInput) {
  const { status, ...rest } = fields;
  await apiFetch(`/revisions/pruefungen/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      preparedBy: rest.prepared_by ?? undefined,
      reportDate: rest.report_date ? new Date(rest.report_date).toISOString() : null,
      presentedTo: rest.presented_to ?? undefined,
      presentedDate: rest.presented_date ? new Date(rest.presented_date).toISOString() : null,
      overallRating: rest.overall_rating ?? undefined,
      budgetDays: rest.budget_days,
      actualDays: rest.actual_days,
      workpaperRef: rest.workpaper_ref ?? undefined,
    }),
  });
  await apiFetch(`/revisions/pruefungen/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  revalidatePath(detailPath(id));
  revalidatePath(LIST_PATH);
  revalidatePath("/interne-revision/pruefungsuniversum");
}

/* =====================================================================
 * Durchführungsform (AT 9 (10)) & Einsichtnahme beim Dienstleister
 * ===================================================================*/

export type DurchfuehrungInput = { durchfuehrung: string; extern_dienstleister: string | null; extern_ablage: string | null };

export async function updateDurchfuehrung(id: string, fields: DurchfuehrungInput) {
  await apiFetch(`/revisions/pruefungen/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      durchfuehrung: fields.durchfuehrung,
      externDienstleister: fields.extern_dienstleister ?? undefined,
      externAblage: fields.extern_ablage ?? undefined,
    }),
  });
  revalidatePath(detailPath(id));
}

export async function addExternEinsicht(pruefungId: string, entry: { datum: string; durch: string; ergebnis: string }) {
  const current = await apiFetch<{ externEinsicht: ExternEinsichtEntry[] | null }>(`/revisions/pruefungen/${pruefungId}`);
  const next: ExternEinsichtEntry[] = [...(current.externEinsicht ?? []), { id: crypto.randomUUID(), ...entry }];
  await apiFetch(`/revisions/pruefungen/${pruefungId}`, { method: "PATCH", body: JSON.stringify({ externEinsicht: next }) });
  revalidatePath(detailPath(pruefungId));
}

/* =====================================================================
 * Prüferzuweisung (Tz. 4)
 * ===================================================================*/

export async function addZuweisung(pruefungId: string, personId: string, role: string) {
  await apiFetch(`/revisions/pruefungen/${pruefungId}/zuweisungen`, { method: "POST", body: JSON.stringify({ userId: personId, role }) });
  revalidatePath(detailPath(pruefungId));
}

export async function removeZuweisung(id: string, pruefungId: string) {
  await apiFetch(`/revisions/pruefungen/${pruefungId}/zuweisungen/${id}`, { method: "DELETE" });
  revalidatePath(detailPath(pruefungId));
}

/* =====================================================================
 * Arbeitsprogramm — Prüfungsschritte (Tz. 10)
 * ===================================================================*/

export type SchrittInput = {
  nummer: number;
  bereich: string | null;
  handlung: string | null;
  risiko: string | null;
  soll_aussage: string | null;
  testschritte: string | null;
  ergebnis: string | null;
  beurteilung: string;
};

export async function addSchritt(pruefungId: string, nummer: number): Promise<string> {
  const created = await apiFetch<{ id: string }>(`/revisions/pruefungen/${pruefungId}/schritte`, { method: "POST", body: JSON.stringify({ nummer }) });
  revalidatePath(detailPath(pruefungId));
  return created.id;
}

export async function updateSchritt(id: string, pruefungId: string, fields: Partial<SchrittInput>) {
  const { soll_aussage, ...rest } = fields;
  await apiFetch(`/revisions/pruefungen/schritte/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...rest, sollAussage: soll_aussage }),
  });
  revalidatePath(detailPath(pruefungId));
}

export async function deleteSchritt(id: string, pruefungId: string) {
  await apiFetch(`/revisions/pruefungen/schritte/${id}`, { method: "DELETE" });
  revalidatePath(detailPath(pruefungId));
}

/* =====================================================================
 * Arbeitspapiere (Tz. 10) inkl. Stichprobendokumentation und Review/Freigabe
 * ===================================================================*/

export type PaperInput = {
  nummer: string | null;
  titel: string;
  typ: string | null;
  handlung: string | null;
  inhalt: string | null;
  quelle: string | null;
  ersteller_person_id: string | null;
  erstellt_am: string | null;
  ergebnis: string | null;
  stichprobe: Stichprobe;
  reviewer_person_id: string | null;
  review_am: string | null;
  review_status: string;
  review_kommentar: string | null;
};

export async function addPaper(schrittId: string, pruefungId: string): Promise<string> {
  const created = await apiFetch<{ id: string }>(`/revisions/pruefungen/schritte/${schrittId}/arbeitspapiere`, {
    method: "POST",
    body: JSON.stringify({ titel: "" }),
  });
  revalidatePath(detailPath(pruefungId));
  return created.id;
}

export async function updatePaper(id: string, pruefungId: string, fields: Partial<Omit<PaperInput, "stichprobe">> & { stichprobe?: Stichprobe }) {
  const { ersteller_person_id, erstellt_am, reviewer_person_id, review_am, review_status, review_kommentar, ...rest } = fields;
  await apiFetch(`/revisions/pruefungen/arbeitspapiere/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...rest,
      erstellerUserId: ersteller_person_id,
      erstelltAm: erstellt_am ? new Date(erstellt_am).toISOString() : erstellt_am,
      reviewerUserId: reviewer_person_id,
      reviewAm: review_am ? new Date(review_am).toISOString() : review_am,
      reviewStatus: review_status,
      reviewKommentar: review_kommentar,
    }),
  });
  revalidatePath(detailPath(pruefungId));
}

export async function deletePaper(id: string, pruefungId: string) {
  await apiFetch(`/revisions/pruefungen/arbeitspapiere/${id}`, { method: "DELETE" });
  revalidatePath(detailPath(pruefungId));
}

/* =====================================================================
 * Qualitätssicherung je Prüfung (Tz. 1 S.2)
 * ===================================================================*/

export async function updateQsChecklist(pruefungId: string, qsChecklist: QsChecklistItem[]) {
  await apiFetch(`/revisions/pruefungen/${pruefungId}/qs-checklist`, { method: "PATCH", body: JSON.stringify({ qsChecklist }) });
  revalidatePath(detailPath(pruefungId));
}

export async function resetQsChecklist(pruefungId: string) {
  await apiFetch(`/revisions/pruefungen/${pruefungId}/qs-checklist`, { method: "PATCH", body: JSON.stringify({ qsChecklist: freshQsChecklist() }) });
  revalidatePath(detailPath(pruefungId));
}

export type QsMetaInput = {
  qs_completed_by: string | null;
  qs_completed_at: string | null;
  qs_reviewed_by: string | null;
  qs_reviewed_at: string | null;
};

export async function updateQsMeta(pruefungId: string, fields: QsMetaInput) {
  await apiFetch(`/revisions/pruefungen/${pruefungId}/qs-meta`, {
    method: "PATCH",
    body: JSON.stringify({
      qsCompletedByUserId: fields.qs_completed_by,
      qsCompletedAt: fields.qs_completed_at ? new Date(fields.qs_completed_at).toISOString() : null,
      qsReviewedByUserId: fields.qs_reviewed_by,
      qsReviewedAt: fields.qs_reviewed_at ? new Date(fields.qs_reviewed_at).toISOString() : null,
    }),
  });
  revalidatePath(detailPath(pruefungId));
}
