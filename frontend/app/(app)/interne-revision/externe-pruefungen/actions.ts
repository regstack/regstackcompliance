"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

const REVALIDATE = "/interne-revision/externe-pruefungen";

export type ExternePruefungInput = { pruefer: string; jahr: number; berichtsdatum: string | null };

/** Interne Revision erfasst den jährlichen Bericht des externen Prüfers, sobald ihn die
 * Geschäftsleitung erhalten hat. */
export async function createExternePruefung(fields: ExternePruefungInput) {
  await apiFetch("/revisions/externe-pruefungen", {
    method: "POST",
    body: JSON.stringify({
      pruefer: fields.pruefer,
      jahr: fields.jahr,
      berichtsdatum: fields.berichtsdatum ? new Date(fields.berichtsdatum).toISOString() : undefined,
    }),
  });
  revalidatePath(REVALIDATE);
  revalidatePath("/dashboard");
}

/** Geschäftsleitung-Kenntnisnahme des externen Prüfungsberichts — "first confirmer wins",
 * wie beim Jahresbericht der Revision. */
export async function acknowledgeExternePruefung(id: string) {
  await apiFetch(`/revisions/externe-pruefungen/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
  revalidatePath("/dashboard");
}

export type ExternePruefungFeststellungInput = {
  titel: string;
  beschreibung: string;
  schweregrad: string;
  frist: string | null;
  modul: string | null;
  fachbereich: string;
  verantwortlich_person_id: string | null;
};

function feststellungBody(fields: ExternePruefungFeststellungInput) {
  return {
    titel: fields.titel,
    beschreibung: fields.beschreibung || undefined,
    schweregrad: fields.schweregrad || undefined,
    frist: fields.frist ? new Date(fields.frist).toISOString() : undefined,
    modul: fields.modul || undefined,
    fachbereich: fields.fachbereich || undefined,
    verantwortlichUserId: fields.verantwortlich_person_id,
  };
}

/** Legt eine Feststellung unter der externen Prüfung an UND verteilt sie im selben Schritt an
 * den Fachbereich — die Zuweisung einer/eines Verantwortlichen IST die Verteilung
 * (verteiltAm/Von wird serverseitig gesetzt, siehe externePruefungen.routes.ts). */
export async function distributeExternePruefungFeststellung(externePruefungId: string, fields: ExternePruefungFeststellungInput) {
  await apiFetch(`/revisions/externe-pruefungen/${externePruefungId}/feststellungen`, {
    method: "POST",
    body: JSON.stringify(feststellungBody(fields)),
  });
  revalidatePath(REVALIDATE);
}

export async function updateExternePruefungFeststellung(id: string, fields: ExternePruefungFeststellungInput) {
  await apiFetch(`/revisions/externe-pruefungen/feststellungen/${id}`, {
    method: "PATCH",
    body: JSON.stringify(feststellungBody(fields)),
  });
  revalidatePath(REVALIDATE);
}

/** Der/die Verantwortliche meldet die Umsetzung — ownership-based, nicht rollenbasiert (siehe
 * canReportMassnahmeErledigt), damit jeder Fachbereich unabhängig von seiner RBAC-Rolle melden
 * kann. */
export async function setFeststellungFachbereichErledigt(id: string) {
  await apiFetch(`/revisions/externe-pruefungen/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "fachbereich_erledigt" }),
  });
  revalidatePath(REVALIDATE);
}

export async function setFeststellungWirksamkeitBestaetigt(id: string) {
  await apiFetch(`/revisions/externe-pruefungen/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "wirksamkeit_bestaetigt" }),
  });
  revalidatePath(REVALIDATE);
}

export async function setFeststellungGeschlossen(id: string) {
  await apiFetch(`/revisions/externe-pruefungen/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "geschlossen" }),
  });
  revalidatePath(REVALIDATE);
}

export async function setFeststellungAkzeptiertesRisiko(id: string, ueberpruefung: string) {
  await apiFetch(`/revisions/externe-pruefungen/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "akzeptiertes_risiko", ueberpruefung: new Date(ueberpruefung).toISOString() }),
  });
  revalidatePath(REVALIDATE);
}
