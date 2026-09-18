"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

/* =====================================================================
 * Quellenregister (Tz. 2)
 * ===================================================================*/

export type QuelleInput = {
  bezeichnung: string;
  bezugsweg: string;
  turnus: string;
  verantwortlich_person_id: string | null;
  letzte_durchsicht: string | null;
};

function quelleBody(fields: QuelleInput) {
  return {
    bezeichnung: fields.bezeichnung,
    bezugsweg: fields.bezugsweg || undefined,
    turnus: fields.turnus || undefined,
    verantwortlichUserId: fields.verantwortlich_person_id,
    letzteDurchsicht: fields.letzte_durchsicht ? new Date(fields.letzte_durchsicht).toISOString() : null,
  };
}

export async function addQuelle(fields: QuelleInput) {
  await apiFetch("/compliance/quellen", { method: "POST", body: JSON.stringify(quelleBody(fields)) });
  revalidatePath("/compliance/ueberwachung");
}

export async function updateQuelle(id: string, fields: QuelleInput) {
  await apiFetch(`/compliance/quellen/${id}`, { method: "PUT", body: JSON.stringify(quelleBody(fields)) });
  revalidatePath("/compliance/ueberwachung");
}

/* =====================================================================
 * Regulatorische Änderungen (Tz. 2)
 * ===================================================================*/

export type AenderungInput = {
  quelle_id: string | null;
  erfasst_am: string;
  gegenstand: string;
  kritikalitaet: string;
  inkrafttreten: string;
  zugewiesen_an_person_id: string | null;
};

export async function addAenderung(fields: AenderungInput) {
  await apiFetch("/compliance/aenderungen", {
    method: "POST",
    body: JSON.stringify({
      quelleId: fields.quelle_id,
      erfasstAm: new Date(fields.erfasst_am).toISOString(),
      gegenstand: fields.gegenstand,
      kritikalitaet: fields.kritikalitaet || undefined,
      inkrafttreten: fields.inkrafttreten || undefined,
      zugewiesenAnUserId: fields.zugewiesen_an_person_id,
    }),
  });
  revalidatePath("/compliance/ueberwachung");
}

export type Disposition = "offen" | "geprueft" | "kenntnis" | "angewandt" | "projekt";

export async function setAenderungDisposition(id: string, disposition: Disposition) {
  await apiFetch(`/compliance/aenderungen/${id}/disposition`, { method: "PATCH", body: JSON.stringify({ disposition }) });
  revalidatePath("/compliance/ueberwachung");
}

/* =====================================================================
 * Rechtsnormenkataster
 * ===================================================================*/

export type NormInput = {
  bezeichnung: string;
  quelle: string;
  sachgebiet: string;
  relevanz: "relevant" | "nicht_relevant";
  relevanz_begruendung: string;
  wesentlichkeit: string;
  wesentlichkeit_begruendung: string;
  risiko: string;
};

function normBody(fields: NormInput) {
  return {
    bezeichnung: fields.bezeichnung,
    quelle: fields.quelle || undefined,
    sachgebiet: fields.sachgebiet || undefined,
    relevanz: fields.relevanz,
    relevanzBegruendung: fields.relevanz_begruendung || undefined,
    wesentlichkeit: fields.wesentlichkeit || undefined,
    wesentlichkeitBegruendung: fields.wesentlichkeit_begruendung || undefined,
    risiko: fields.risiko || undefined,
  };
}

export async function addNorm(fields: NormInput): Promise<string> {
  const created = await apiFetch<{ id: string }>("/compliance/normen", { method: "POST", body: JSON.stringify(normBody(fields)) });
  revalidatePath("/compliance/normen");
  return created.id;
}

export async function updateNorm(id: string, fields: NormInput) {
  await apiFetch(`/compliance/normen/${id}`, { method: "PATCH", body: JSON.stringify(normBody(fields)) });
  revalidatePath(`/compliance/normen/${id}`);
  revalidatePath("/compliance/normen");
}

/** Vorschlag: Compliance proposes which Fachbereich is responsible for a norm. `fachbereich_person_id`
 * on the norm itself is a backend-derived mirror of this handshake — never written directly. */
export async function proposeNormZuweisung(normId: string, targetPersonId: string) {
  await apiFetch(`/compliance/normen/${normId}/handshake`, { method: "POST", body: JSON.stringify({ assignedUserId: targetPersonId }) });
  revalidatePath(`/compliance/normen/${normId}`);
}

/** The target Fachbereich person confirms or disputes a proposed assignment — an ownership check
 * on the backend (is this the assigned user?), not a role check. */
export async function respondNormZuweisung(handshakeId: string, normId: string, response: "bestaetigt" | "widersprochen", disputeReason?: string) {
  await apiFetch(`/compliance/normen/${normId}/handshake/${handshakeId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response, disputeReason }),
  });
  revalidatePath(`/compliance/normen/${normId}`);
}

/** Geschäftsleitung resolves a disputed assignment. */
export async function decideNormZuweisung(handshakeId: string, normId: string, note: string) {
  await apiFetch(`/compliance/normen/${normId}/handshake/${handshakeId}/decide`, {
    method: "POST",
    body: JSON.stringify({ decisionNote: note }),
  });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/dashboard");
}

/* =====================================================================
 * Feststellungen
 * ===================================================================*/

export type FeststellungInput = {
  titel: string;
  beschreibung: string;
  schweregrad: string;
  frist: string | null;
  massnahme: string;
  quelle: string;
  verantwortlich_person_id: string | null;
};

export async function addFeststellung(normId: string, fields: FeststellungInput) {
  await apiFetch(`/compliance/feststellungen/for-norm/${normId}`, {
    method: "POST",
    body: JSON.stringify({
      titel: fields.titel,
      beschreibung: fields.beschreibung || undefined,
      schweregrad: fields.schweregrad || undefined,
      frist: fields.frist ? new Date(fields.frist).toISOString() : null,
      massnahme: fields.massnahme || undefined,
      quelle: fields.quelle || undefined,
      verantwortlichUserId: fields.verantwortlich_person_id,
    }),
  });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/compliance/feststellungen");
}

/** Fachbereich reports its remediation done — a separate step from Compliance confirming
 * effectiveness (`wirksamkeit_bestaetigt`), never the same action. */
export async function setFeststellungFachbereichErledigt(id: string, normId: string) {
  await apiFetch(`/compliance/feststellungen/${id}/status`, { method: "PATCH", body: JSON.stringify({ action: "fachbereich_erledigt" }) });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/compliance/feststellungen");
}

export async function setFeststellungWirksamkeitBestaetigt(id: string, normId: string) {
  await apiFetch(`/compliance/feststellungen/${id}/status`, { method: "PATCH", body: JSON.stringify({ action: "wirksamkeit_bestaetigt" }) });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/compliance/feststellungen");
}

export async function setFeststellungGeschlossen(id: string, normId: string) {
  await apiFetch(`/compliance/feststellungen/${id}/status`, { method: "PATCH", body: JSON.stringify({ action: "geschlossen" }) });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/compliance/feststellungen");
}

export async function setFeststellungAkzeptiertesRisiko(id: string, normId: string, ueberpruefungsdatum: string) {
  await apiFetch(`/compliance/feststellungen/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action: "akzeptiertes_risiko", ueberpruefung: new Date(ueberpruefungsdatum).toISOString() }),
  });
  revalidatePath(`/compliance/normen/${normId}`);
  revalidatePath("/compliance/feststellungen");
}

/* =====================================================================
 * Compliance-Rating je Periode (Tz. 6)
 * ===================================================================*/

export async function addComplianceRating(fields: { periode: string; rating: string; begruendung: string | null }) {
  await apiFetch("/compliance/ratings", { method: "POST", body: JSON.stringify(fields) });
  revalidatePath("/compliance");
  revalidatePath("/compliance/bericht");
}

/* =====================================================================
 * Governance-Einstellungen (Tz. 3-4, institutsweites Singleton)
 * ===================================================================*/

export type GovernanceSettingsInput = {
  sonderfall_kleines_institut: boolean;
  interessenkonflikt_massnahmen: string | null;
  kombination_rationale: string | null;
  ressourcenausstattung: string | null;
};

export async function upsertGovernanceSettings(fields: GovernanceSettingsInput) {
  await apiFetch("/compliance/governance", {
    method: "PUT",
    body: JSON.stringify({
      sonderfallKleinesInstitut: fields.sonderfall_kleines_institut,
      interessenkonfliktMassnahmen: fields.interessenkonflikt_massnahmen,
      kombinationRationale: fields.kombination_rationale,
      ressourcenausstattung: fields.ressourcenausstattung,
    }),
  });
  revalidatePath("/compliance/governance");
}

/* =====================================================================
 * Bericht an die Geschaeftsleitung (Tz. 6)
 * ===================================================================*/

export async function finalizeReport(id: string) {
  await apiFetch(`/compliance/reports/${id}/finalize`, { method: "POST" });
  revalidatePath("/compliance/bericht");
}

/** Records the current user's own Kenntnisnahme — one real row per person
 * (ComplianceReportAcknowledgement), replacing the Supabase-era single kenntnisnahme_by/at plus
 * the app-level content.recipients name-matching workaround. */
export async function acknowledgeReport(id: string) {
  await apiFetch(`/compliance/reports/${id}/acknowledge`, { method: "POST" });
  revalidatePath("/compliance/bericht");
  revalidatePath("/dashboard");
}
