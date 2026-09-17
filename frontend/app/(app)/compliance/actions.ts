"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

async function requirePerson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: person } = await supabase
    .from("persons")
    .select("id, tenant_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!person) throw new Error("Kein Stammdaten-Eintrag für diesen Nutzer.");

  return { supabase, person };
}

export type QuelleInput = { bezeichnung: string; bezugsweg: string; turnus: string; verantwortlich_person_id: string | null; letzte_durchsicht: string | null };

export async function addQuelle(fields: QuelleInput) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase.from("quellen").insert({ ...fields, tenant_id: person.tenant_id, created_by: person.id });
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/quellen");
}

export async function updateQuelle(id: string, fields: QuelleInput) {
  const { supabase } = await requirePerson();
  const { error } = await supabase.from("quellen").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/quellen");
}

export type AenderungInput = {
  quelle_id: string | null; erfasst_am: string; gegenstand: string; kritikalitaet: string;
  inkrafttreten: string; zugewiesen_an_person_id: string | null;
};

export async function addAenderung(fields: AenderungInput) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase.from("regulatorische_aenderungen").insert({ ...fields, tenant_id: person.tenant_id, created_by: person.id });
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/aenderungen");
}

export type Disposition = "offen" | "geprueft" | "kenntnis" | "angewandt" | "projekt";

export async function setAenderungDisposition(id: string, disposition: Disposition) {
  const { supabase } = await requirePerson();
  const { error } = await supabase.from("regulatorische_aenderungen").update({ disposition }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/aenderungen");
}

export type NormInput = {
  bezeichnung: string; quelle: string; sachgebiet: string; relevanz: "relevant" | "nicht_relevant";
  relevanz_begruendung: string; wesentlichkeit: string; wesentlichkeit_begruendung: string; risiko: string;
};

export async function addNorm(fields: NormInput) {
  const { supabase, person } = await requirePerson();
  const { data, error } = await supabase
    .from("normen")
    .insert({ ...fields, tenant_id: person.tenant_id, created_by: person.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/normen");
  return data.id as string;
}

export async function updateNorm(id: string, fields: NormInput) {
  const { supabase } = await requirePerson();
  const { error } = await supabase.from("normen").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${id}`);
  revalidatePath("/compliance/normen");
}

/** Vorschlag: Compliance proposes which Fachbereich is responsible for a norm. `fachbereich_person_id`
 * on the norm itself is a DB-trigger-derived mirror of this handshake — never written directly. */
export async function proposeNormZuweisung(normId: string, targetPersonId: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase.from("assignment_handshakes").insert({
    tenant_id: person.tenant_id,
    module: "compliance",
    entity_type: "norm_zuweisung",
    entity_id: normId,
    target_person_id: targetPersonId,
    proposed_by: person.id,
    status: "vorschlag",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

/** The target Fachbereich person confirms or disputes a proposed assignment. */
export async function respondNormZuweisung(handshakeId: string, normId: string, response: "bestaetigt" | "widersprochen", disputeReason?: string) {
  const { supabase } = await requirePerson();
  const patch: Database["public"]["Tables"]["assignment_handshakes"]["Update"] = { status: response };
  if (response === "bestaetigt") patch.confirmed_at = new Date().toISOString();
  else {
    patch.dispute_reason = disputeReason || null;
    patch.disputed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("assignment_handshakes").update(patch).eq("id", handshakeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

/** Geschäftsleitung resolves a disputed assignment. */
export async function decideNormZuweisung(handshakeId: string, normId: string, note: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("assignment_handshakes")
    .update({ status: "entschieden", decision_by: person.id, decision_at: new Date().toISOString(), decision_note: note })
    .eq("id", handshakeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

export type FeststellungInput = {
  titel: string; beschreibung: string; schweregrad: string; frist: string | null;
  massnahme: string; quelle: string; verantwortlich_person_id: string | null;
};

export async function addFeststellung(normId: string, fields: FeststellungInput) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase.from("feststellungen").insert({ ...fields, norm_id: normId, tenant_id: person.tenant_id, created_by: person.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

/** Fachbereich reports its remediation done — a separate step from Compliance confirming
 * effectiveness (`wirksamkeit_bestaetigt`), never the same action. */
export async function setFeststellungFachbereichErledigt(id: string, normId: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("feststellungen")
    .update({ status: "fachbereich_erledigt", fachbereich_erledigt_von: person.id, fachbereich_erledigt_am: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

export async function setFeststellungWirksamkeitBestaetigt(id: string, normId: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("feststellungen")
    .update({ status: "wirksamkeit_bestaetigt", wirksamkeit_bestaetigt_von: person.id, wirksamkeit_bestaetigt_am: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

export async function setFeststellungGeschlossen(id: string, normId: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("feststellungen")
    .update({ status: "geschlossen", geschlossen_von: person.id, geschlossen_am: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

export async function setFeststellungAkzeptiertesRisiko(id: string, normId: string, ueberpruefungsdatum: string) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("feststellungen")
    .update({ status: "akzeptiertes_risiko", akzeptiertes_risiko_entscheider: person.id, akzeptiertes_risiko_ueberpruefung: ueberpruefungsdatum })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/compliance/normen/${normId}`);
}

/* =====================================================================
 * Compliance-Rating je Periode (Tz. 6)
 * ===================================================================*/

export async function addComplianceRating(fields: { periode: string; rating: string; begruendung: string | null }) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("compliance_ratings")
    .insert({ ...fields, tenant_id: person.tenant_id, erfasst_von: person.id, erfasst_am: new Date().toISOString().slice(0, 10) });
  if (error) throw new Error(error.message);
  revalidatePath("/compliance");
  revalidatePath("/compliance/bericht");
}

/* =====================================================================
 * Governance-Einstellungen (Tz. 3-4, tenant-weites Singleton)
 * ===================================================================*/

export type GovernanceSettingsInput = {
  sonderfall_kleines_institut: boolean;
  interessenkonflikt_massnahmen: string | null;
  kombination_rationale: string | null;
  ressourcenausstattung: string | null;
};

export async function upsertGovernanceSettings(fields: GovernanceSettingsInput) {
  const { supabase, person } = await requirePerson();
  const { error } = await supabase
    .from("governance_settings")
    .upsert({ ...fields, tenant_id: person.tenant_id, updated_by: person.id, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/governance");
}

/* =====================================================================
 * Bericht an die Geschaeftsleitung (Tz. 6)
 * ===================================================================*/

/** Finalizes a draft report (Compliance) so it can go to the Geschaeftsleitung for Kenntnisnahme. */
export async function finalizeReport(id: string) {
  const { supabase } = await requirePerson();
  const { error } = await supabase.from("reports").update({ status: "final" }).eq("id", id).eq("status", "entwurf");
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/bericht");
}

/** Records this Geschaeftsleitung member's Kenntnisnahme. The reports table has a single
 * kenntnisnahme_by/at pair (first-acknowledger wins there); every recipient's own ack date is
 * additionally tracked in content.recipients so the report still shows who signed off. */
export async function ackReportRecipient(id: string, recipientName: string) {
  const { supabase, person } = await requirePerson();
  const today = new Date().toISOString().slice(0, 10);

  const { data: current, error: readError } = await supabase
    .from("reports")
    .select("content, status, kenntnisnahme_at")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);
  if (current.status !== "final") throw new Error("Nur finale Berichte koennen zur Kenntnis genommen werden.");

  type Recipient = { name: string; ack_at: string | null };
  const content = (current.content ?? {}) as { recipients?: Recipient[] };
  const recipients = (content.recipients ?? []).map((r) =>
    r.name === recipientName ? { ...r, ack_at: r.ack_at ?? today } : r
  );

  const patch: Database["public"]["Tables"]["reports"]["Update"] = {
    content: { ...content, recipients } as Database["public"]["Tables"]["reports"]["Row"]["content"],
  };
  if (!current.kenntnisnahme_at) {
    patch.kenntnisnahme_by = person.id;
    patch.kenntnisnahme_at = today;
  }

  const { error } = await supabase.from("reports").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compliance/bericht");
}
