import { createClient } from "@/lib/supabase/server";

// Pure helpers (naechsteFaelligkeit, isOverdue, gap-analysis, governanceWarnings, ...) live in
// compliance-utils.ts, which has no "next/headers" dependency, and are re-exported here so
// existing Server Component imports from "@/lib/regstack/compliance" keep working. Client
// Components must import them from "@/lib/regstack/compliance-utils" directly instead of from
// this module, since importing anything from here pulls the server-only Supabase client into
// the browser bundle.
export * from "@/lib/regstack/compliance-utils";

export async function listQuellen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quellen")
    .select("id, bezeichnung, bezugsweg, turnus, verantwortlich_person_id, letzte_durchsicht, persons:verantwortlich_person_id(full_name)")
    .order("bezeichnung", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAenderungen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regulatorische_aenderungen")
    .select(
      "id, quelle_id, erfasst_am, gegenstand, kritikalitaet, inkrafttreten, zugewiesen_an_person_id, disposition, quellen:quelle_id(bezeichnung), persons:zugewiesen_an_person_id(full_name)"
    )
    .order("erfasst_am", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listNormen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("normen")
    .select("id, bezeichnung, sachgebiet, relevanz, wesentlichkeit, risiko, status, fachbereich_person_id, personalunion, persons:fachbereich_person_id(full_name)")
    .order("bezeichnung", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getNorm(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("normen").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNormZuweisungHandshake(normId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_handshakes")
    .select(
      "id, status, target_person_id, proposed_by, proposed_at, confirmed_at, dispute_reason, disputed_at, decision_by, decision_at, decision_note, target:target_person_id(full_name), proposer:proposed_by(full_name)"
    )
    .eq("module", "compliance")
    .eq("entity_type", "norm_zuweisung")
    .eq("entity_id", normId)
    .order("proposed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** All Normzuweisung-Handshakes (Rechtsnormenkataster) across the tenant, with the norm's name. */
export async function listNormZuweisungHandshakes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_handshakes")
    .select(
      "id, entity_id, status, target_person_id, proposed_by, proposed_at, confirmed_at, dispute_reason, disputed_at, decision_by, decision_at, decision_note"
    )
    .eq("module", "compliance")
    .eq("entity_type", "norm_zuweisung")
    .order("proposed_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Cross-tenant Feststellungs- und Massnahmenregister (all norms), for the dedicated register
 * page and for dashboard aggregates — unlike listFeststellungenForNorm, not scoped to one norm. */
export async function listFeststellungen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feststellungen")
    .select(
      "id, norm_id, titel, beschreibung, status, schweregrad, frist, massnahme, quelle, verantwortlich_person_id, fachbereich_erledigt_am, fachbereich_erledigt_von, wirksamkeit_bestaetigt_am, wirksamkeit_bestaetigt_von, akzeptiertes_risiko_entscheider, akzeptiertes_risiko_ueberpruefung, geschlossen_am, geschlossen_von, created_at, normen:norm_id(bezeichnung), verantwortlich:verantwortlich_person_id(full_name)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listFeststellungenForNorm(normId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feststellungen")
    .select("id, norm_id, titel, beschreibung, status, schweregrad, frist, massnahme, quelle, verantwortlich_person_id, fachbereich_erledigt_am, fachbereich_erledigt_von, wirksamkeit_bestaetigt_am, wirksamkeit_bestaetigt_von, akzeptiertes_risiko_entscheider, akzeptiertes_risiko_ueberpruefung, geschlossen_am, geschlossen_von, created_at, verantwortlich:verantwortlich_person_id(full_name)")
    .eq("norm_id", normId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllPersons() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("persons").select("id, full_name").order("full_name", { ascending: true });
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Risiken & Kontrollen (Tz. 1)
 * ===================================================================*/

export async function listRisiken() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("risiken")
    .select("id, nr, bezeichnung, eintrittswahrscheinlichkeit, auswirkung, inhaerent, kontrollbewertung, restrisiko, massnahme, verantwortlich_person_id, verantwortlich:verantwortlich_person_id(full_name)")
    .order("nr", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listKontrollen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kontrollen")
    .select("id, norm_id, verfahren, prozess, turnus, letzte_durchfuehrung, naechste_faelligkeit, wirksamkeit, verantwortlich_person_id, autor_person_id, freigegeben_von_person_id, freigegeben_am, normen:norm_id(bezeichnung), verantwortlich:verantwortlich_person_id(full_name)")
    .order("naechste_faelligkeit", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function listNormRisikenLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("norm_risiken").select("norm_id, risiko_id, normen:norm_id(bezeichnung), risiken:risiko_id(nr, bezeichnung)");
  if (error) throw error;
  return data;
}

export async function listRisikoKontrollenLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("risiko_kontrollen").select("risiko_id, kontrolle_id");
  if (error) throw error;
  return data;
}

export async function listBeratung() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beratung_schulung")
    .select("id, datum, thema, adressat, format, nachweis_text")
    .order("datum", { ascending: false });
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Nachweis-Ablage
 * ===================================================================*/

export async function listNachweise() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nachweise")
    .select("id, module, entity_type, entity_id, dateiname, file_ref, hash, aufbewahrungsfrist, previous_version_id, uploaded_by, uploaded_at, uploader:uploaded_by(full_name)")
    .eq("module", "compliance")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Governance (Tz. 3-4)
 * ===================================================================*/

export async function listBeauftragte() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beauftragtenfunktionen")
    .select("id, funktion, rechtsgrundlage, inhaber_person_id, stellvertretung_person_id, bestellt_am, anzeige_aufsicht, inhaber:inhaber_person_id(full_name), stellvertretung:stellvertretung_person_id(full_name)")
    .order("bestellt_am", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listFunktionswechsel() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funktionswechsel")
    .select("id, funktion_id, datum, bisher_text, neu_person_id, beschluss, anzeige_aufsicht, funktion:funktion_id(funktion), neu:neu_person_id(full_name)")
    .order("datum", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listErleichterungen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("erleichterungen")
    .select("id, gegenstand, rechtsgrundlage, gewaehrt_durch, gewaehrt_am, aktenzeichen, reichweite, formal_erleichtert, materiell_erfuellt, begruendung, ueberpruefung")
    .order("ueberpruefung", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function listStellenbeschreibungen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stellenbeschreibungen")
    .select("id, dokument, fassung, genehmigt_durch_person_id, genehmigt_am, naechste_ueberpruefung")
    .order("naechste_ueberpruefung", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function getGovernanceSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("governance_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Informationsrechte (Tz. 5)
 * ===================================================================*/

export async function listGremien() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gremien_zulieferungen")
    .select("id, typ, bezeichnung, grundlage, turnus, letzter_eingang")
    .order("typ", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listEreignisse() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ereignisse")
    .select("id, datum, ausloeser, gegenstand, beteiligung, votum")
    .order("datum", { ascending: false });
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Bericht an die Geschaeftsleitung (Tz. 6) + Compliance-Rating
 * ===================================================================*/

export async function listRatings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_ratings")
    .select("id, periode, rating, begruendung, erfasst_am, erfasst_von:erfasst_von(full_name)")
    .order("erfasst_am", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listReports() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, report_type, period_from, period_to, status, content, finalized_at, kenntnisnahme_by, kenntnisnahme_at, kenntnisnehmer:kenntnisnahme_by(full_name)")
    .eq("module", "compliance")
    .order("period_from", { ascending: false });
  if (error) throw error;
  return data;
}

/* =====================================================================
 * Audit-Trail
 * ===================================================================*/

export async function listAuditLog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, occurred_at, details")
    .eq("module", "compliance")
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

