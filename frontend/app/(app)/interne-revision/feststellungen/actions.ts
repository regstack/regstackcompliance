"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { Escalation, ExecEscalation } from "@/lib/regstack/revisions-utils";

const REVALIDATE = "/interne-revision/feststellungen";

export type FeststellungInput = {
  pruefung_id: string;
  titel: string;
  beschreibung: string;
  schweregrad: string;
  frist_urspruenglich: string | null;
  verantwortlich_person_id: string | null;
  executive_target: boolean;
};

/** Every Feststellung is created from within a specific Prüfung — pruefungsobjekt_id is derived
 * from it server-side, never chosen separately, so a finding can never point at a mismatched
 * object (see feststellungen.routes.ts). */
export async function createFeststellung(fields: FeststellungInput) {
  await apiFetch("/revisions/feststellungen", {
    method: "POST",
    body: JSON.stringify({
      pruefungId: fields.pruefung_id,
      titel: fields.titel,
      beschreibung: fields.beschreibung || undefined,
      schweregrad: fields.schweregrad || undefined,
      fristUrspruenglich: fields.frist_urspruenglich ? new Date(fields.frist_urspruenglich).toISOString() : null,
      verantwortlichUserId: fields.verantwortlich_person_id,
      executiveTarget: fields.executive_target,
    }),
  });
  revalidatePath(REVALIDATE);
}

/** Fachbereich (Verantwortliche/r des Prüfungsobjekts) meldet die vereinbarte Maßnahme als
 * erledigt. The backend checks ownership directly (is this user the Prüfungsobjekt's
 * verantwortlichUserId?) rather than a role, and only allows offen -> massnahme_erledigt. */
export async function setFeststellungMassnahmeErledigt(id: string) {
  await apiFetch(`/revisions/feststellungen/${id}/status`, { method: "PATCH", body: JSON.stringify({ action: "massnahme_erledigt" }) });
  revalidatePath(REVALIDATE);
}

export type AbschlussFields = {
  nachweis?: string;
  bestaetigtVon?: string;
  bestaetigtAm?: string;
  restrisiko?: string;
  kompensation?: string;
  akzeptiertVon?: string;
};

/** Speichert den Abschluss-Entwurf (Nachweis, Bestätigung), OHNE zu schließen — das Schließen
 * ist ein bewusster letzter, separater Schritt, siehe setFeststellungGeschlossen. */
export async function updateAbschlussEntwurf(id: string, abschluss: AbschlussFields) {
  await apiFetch(`/revisions/feststellungen/${id}`, { method: "PATCH", body: JSON.stringify({ abschluss }) });
  revalidatePath(REVALIDATE);
}

/** Letzter Schritt: setzt abschlussArt, schreibt den finalen Abschluss-Block und schließt
 * endgültig — nur für INTERNE_REVISION/ADMIN (server-enforced), danach unveränderlich. */
export async function setFeststellungGeschlossen(id: string, abschlussArt: "erledigt" | "restrisiko", abschluss: AbschlussFields) {
  await apiFetch(`/revisions/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "geschlossen", abschlussArt, abschluss }),
  });
  revalidatePath(REVALIDATE);
}

export type StellungnahmeFields = { verfasser?: string; datum?: string; status?: string; text?: string };

/** Stellungnahme des geprüften Bereichs — wandert unverändert in den Bericht, auch ein
 * Widerspruch; das System bewertet sie nicht, es bewahrt sie. */
export async function updateStellungnahme(id: string, stellungnahme: StellungnahmeFields) {
  await apiFetch(`/revisions/feststellungen/${id}`, { method: "PATCH", body: JSON.stringify({ stellungnahme }) });
  revalidatePath(REVALIDATE);
}

export async function setExecutiveTarget(id: string, executiveTarget: boolean) {
  await apiFetch(`/revisions/feststellungen/${id}`, { method: "PATCH", body: JSON.stringify({ executiveTarget }) });
  revalidatePath(REVALIDATE);
}

/** Tz. 8 — Feststellung gegen einen Geschäftsleiter: IR meldet unverzüglich der GL, diese
 * unverzüglich BaFin und Bundesbank. */
export async function updateExecEscalation(id: string, execEscalation: ExecEscalation) {
  await apiFetch(`/revisions/feststellungen/${id}`, { method: "PATCH", body: JSON.stringify({ execEscalation }) });
  revalidatePath(REVALIDATE);
}

/** Tz. 12 — Eskalation bei nicht fristgerechter Beseitigung wesentlicher Mängel. */
export async function updateEscalation(id: string, escalation: Escalation) {
  await apiFetch(`/revisions/feststellungen/${id}`, { method: "PATCH", body: JSON.stringify({ escalation }) });
  revalidatePath(REVALIDATE);
}

/** Tz. 11 — Überwachung der Beseitigung, gilt für jede Feststellung unabhängig vom Schweregrad. */
export async function updateNachschau(id: string, nachschauNeeded: boolean, nachschauDate: string | null) {
  await apiFetch(`/revisions/feststellungen/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ nachschauNeeded, nachschauDate: nachschauDate ? new Date(nachschauDate).toISOString() : null }),
  });
  revalidatePath(REVALIDATE);
}

export type FristverlaengerungInput = { neu: string; antragsteller: string; genehmiger: string | null; begruendung: string };

/** Append-only Fristenhistorie — nur Insert, nie Update/Delete. Die ursprünglich zugesagte
 * Frist (frist_urspruenglich) wird dabei nie angefasst; `alt` wird serverseitig aus der zuletzt
 * wirksamen Frist bestimmt, nicht vom Client übergeben. */
export async function addFristverlaengerung(feststellungId: string, _alt: string | null, fields: FristverlaengerungInput) {
  await apiFetch(`/revisions/feststellungen/${feststellungId}/fristverlaengerung`, {
    method: "POST",
    body: JSON.stringify({
      neu: new Date(fields.neu).toISOString(),
      antragsteller: fields.antragsteller || undefined,
      genehmiger: fields.genehmiger ?? undefined,
      begruendung: fields.begruendung || undefined,
    }),
  });
  revalidatePath(REVALIDATE);
}
