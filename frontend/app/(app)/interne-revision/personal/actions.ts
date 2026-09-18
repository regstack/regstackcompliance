"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

const REVALIDATE = "/interne-revision/personal";

/* =====================================================================
 * revision_personal (Tz. 3-4, Upsert je Person)
 * ===================================================================*/

export type RevisionPersonalInput = {
  qualifikation: string | null;
  soll_fortbildung_tage: number;
  non_audit_tasks: string | null;
  advisory_active: boolean;
  advisory_safeguard: string | null;
};

export async function upsertRevisionPersonal(personId: string, fields: RevisionPersonalInput) {
  await apiFetch("/revisions/personal", {
    method: "PUT",
    body: JSON.stringify({
      userId: personId,
      qualifikation: fields.qualifikation,
      sollFortbildungTage: fields.soll_fortbildung_tage,
      nonAuditTasks: fields.non_audit_tasks,
      advisoryActive: fields.advisory_active,
      advisorySafeguard: fields.advisory_safeguard,
    }),
  });
  revalidatePath(REVALIDATE);
}

/* =====================================================================
 * revision_schulungen (Fortbildungsnachweise je Person — einfache Liste)
 * ===================================================================*/

export type SchulungInput = { titel: string; datum: string | null; umfang: number | null; nachweis_text: string | null };

export async function addRevisionSchulung(personId: string, fields: SchulungInput) {
  await apiFetch("/revisions/personal/schulungen", {
    method: "POST",
    body: JSON.stringify({
      userId: personId,
      titel: fields.titel,
      datum: fields.datum ? new Date(fields.datum).toISOString() : new Date().toISOString(),
      umfang: fields.umfang,
      nachweisText: fields.nachweis_text ?? undefined,
    }),
  });
  revalidatePath(REVALIDATE);
}

export async function deleteRevisionSchulung(id: string) {
  await apiFetch(`/revisions/personal/schulungen/${id}`, { method: "DELETE" });
  revalidatePath(REVALIDATE);
}

/* =====================================================================
 * revision_sperrfristen (Tz. 4 — Sperrfrist nach Wechsel aus geprüftem Bereich)
 * ===================================================================*/

export type SperrfristInput = {
  person_id: string | null; name: string | null; from_unit: string | null; transfer_date: string | null;
  barred_areas: string | null; bar_end_date: string | null; deviation: boolean; deviation_reason: string | null;
};

function sperrfristBody(fields: SperrfristInput) {
  return {
    userId: fields.person_id,
    name: fields.name ?? undefined,
    fromUnit: fields.from_unit ?? undefined,
    transferDate: fields.transfer_date ? new Date(fields.transfer_date).toISOString() : null,
    barredAreas: fields.barred_areas ?? undefined,
    barEndDate: fields.bar_end_date ? new Date(fields.bar_end_date).toISOString() : null,
    deviation: fields.deviation,
    deviationReason: fields.deviation_reason ?? undefined,
  };
}

export async function addSperrfrist(fields: SperrfristInput) {
  await apiFetch("/revisions/personal/sperrfristen", { method: "POST", body: JSON.stringify(sperrfristBody(fields)) });
  revalidatePath(REVALIDATE);
}

export async function updateSperrfrist(id: string, fields: SperrfristInput) {
  await apiFetch(`/revisions/personal/sperrfristen/${id}`, { method: "PATCH", body: JSON.stringify(sperrfristBody(fields)) });
  revalidatePath(REVALIDATE);
}

/* =====================================================================
 * revision_sonderwissen (Tz. 4 S.2 — temporärer beratender Einsatz von Spezialwissen)
 * ===================================================================*/

export type SonderwissenInput = {
  person_id: string | null; name: string | null; from_unit: string | null; topic: string | null;
  pruefung_id: string | null; duration_text: string | null;
};

function sonderwissenBody(fields: SonderwissenInput) {
  return {
    userId: fields.person_id,
    name: fields.name ?? undefined,
    fromUnit: fields.from_unit ?? undefined,
    topic: fields.topic ?? undefined,
    pruefungId: fields.pruefung_id,
    durationText: fields.duration_text ?? undefined,
  };
}

export async function addSonderwissen(fields: SonderwissenInput) {
  await apiFetch("/revisions/personal/sonderwissen", { method: "POST", body: JSON.stringify(sonderwissenBody(fields)) });
  revalidatePath(REVALIDATE);
}

export async function updateSonderwissen(id: string, fields: SonderwissenInput) {
  await apiFetch(`/revisions/personal/sonderwissen/${id}`, { method: "PATCH", body: JSON.stringify(sonderwissenBody(fields)) });
  revalidatePath(REVALIDATE);
}
