import { cache } from "react";
import { apiFetch } from "@/lib/regstack/backend-client";

// Pure helpers (naechsteFaelligkeit, isOverdue, gap-analysis, governanceWarnings, ...) live in
// compliance-utils.ts, which has no server-only dependency, and are re-exported here so existing
// Server Component imports from "@/lib/regstack/compliance" keep working. Client Components must
// import them from "@/lib/regstack/compliance-utils" directly instead of from this module, since
// importing anything from here pulls the server-only backend client into the browser bundle.
export * from "@/lib/regstack/compliance-utils";

// ---------------------------------------------------------------------------
// This module is an adapter: the backend returns camelCase Prisma shapes with no embedded joins
// (besides a few explicit `include`s), but every page/component in this app was written against
// the Supabase-era snake_case shapes with embedded `{ full_name }`/`{ bezeichnung }` objects. Read
// functions below reshape backend responses back into that exact shape so the ~20 files that
// consume them don't all need a parallel rewrite — the same "keep the interface, swap the
// transport" approach the Outsourcing migration used for ContractRecord/HandlungsoptionRecord.
// ---------------------------------------------------------------------------

type BackendUser = { id: string; name: string; role: string };

const getUserNameMap = cache(async (): Promise<Map<string, string>> => {
  const users = await apiFetch<BackendUser[]>("/users");
  return new Map(users.map((u) => [u.id, u.name]));
});

function iso10(date: string | null | undefined): string | null {
  return date ? date.slice(0, 10) : null;
}

function personRef(names: Map<string, string>, userId: string | null | undefined): { full_name: string } | null {
  return userId ? { full_name: names.get(userId) ?? "—" } : null;
}

export async function listAllPersons(): Promise<{ id: string; full_name: string }[]> {
  const users = await apiFetch<BackendUser[]>("/users");
  return users.map((u) => ({ id: u.id, full_name: u.name }));
}

/* =====================================================================
 * Überwachung (Tz. 2): Quellen & regulatorische Änderungen
 * ===================================================================*/

type BackendQuelle = {
  id: string;
  bezeichnung: string;
  bezugsweg: string | null;
  turnus: string | null;
  verantwortlichUserId: string | null;
  letzteDurchsicht: string | null;
};

export async function listQuellen() {
  const [quellen, names] = await Promise.all([apiFetch<BackendQuelle[]>("/compliance/quellen"), getUserNameMap()]);
  return quellen.map((q) => ({
    id: q.id,
    bezeichnung: q.bezeichnung,
    bezugsweg: q.bezugsweg,
    turnus: q.turnus,
    verantwortlich_person_id: q.verantwortlichUserId,
    letzte_durchsicht: iso10(q.letzteDurchsicht),
    persons: personRef(names, q.verantwortlichUserId),
  }));
}

type BackendAenderung = {
  id: string;
  quelleId: string | null;
  erfasstAm: string;
  gegenstand: string;
  kritikalitaet: string | null;
  inkrafttreten: string | null;
  zugewiesenAnUserId: string | null;
  disposition: string;
  quelle: { bezeichnung: string } | null;
};

export async function listAenderungen() {
  const [aenderungen, names] = await Promise.all([apiFetch<BackendAenderung[]>("/compliance/aenderungen"), getUserNameMap()]);
  return aenderungen.map((a) => ({
    id: a.id,
    quelle_id: a.quelleId,
    erfasst_am: iso10(a.erfasstAm)!,
    gegenstand: a.gegenstand,
    kritikalitaet: a.kritikalitaet,
    inkrafttreten: a.inkrafttreten,
    zugewiesen_an_person_id: a.zugewiesenAnUserId,
    disposition: a.disposition,
    quellen: a.quelle ? { bezeichnung: a.quelle.bezeichnung } : null,
    persons: personRef(names, a.zugewiesenAnUserId),
  }));
}

/* =====================================================================
 * Rechtsnormenkataster (Tz. 2)
 * ===================================================================*/

type BackendNorm = {
  id: string;
  bezeichnung: string;
  quelle: string | null;
  sachgebiet: string | null;
  relevanz: string;
  relevanzBegruendung: string | null;
  relevanzUebersteuert: boolean;
  wesentlichkeit: string | null;
  wesentlichkeitBegruendung: string | null;
  risiko: string | null;
  status: string;
  stand: string | null;
  personalunion: boolean;
  fachbereichUserId: string | null;
};

export async function listNormen() {
  const [normen, names] = await Promise.all([apiFetch<BackendNorm[]>("/compliance/normen"), getUserNameMap()]);
  return normen.map((n) => ({
    id: n.id,
    bezeichnung: n.bezeichnung,
    sachgebiet: n.sachgebiet,
    relevanz: n.relevanz,
    wesentlichkeit: n.wesentlichkeit,
    risiko: n.risiko,
    status: n.status,
    fachbereich_person_id: n.fachbereichUserId,
    personalunion: n.personalunion,
    persons: personRef(names, n.fachbereichUserId),
  }));
}

export async function getNorm(id: string) {
  const n = await apiFetch<BackendNorm>(`/compliance/normen/${id}`);
  return {
    id: n.id,
    bezeichnung: n.bezeichnung,
    quelle: n.quelle,
    sachgebiet: n.sachgebiet,
    relevanz: n.relevanz,
    relevanz_begruendung: n.relevanzBegruendung,
    relevanz_uebersteuert: n.relevanzUebersteuert,
    wesentlichkeit: n.wesentlichkeit,
    wesentlichkeit_begruendung: n.wesentlichkeitBegruendung,
    risiko: n.risiko,
    status: n.status,
    stand: n.stand,
    personalunion: n.personalunion,
    fachbereich_person_id: n.fachbereichUserId,
  };
}

type BackendHandshake = {
  id: string;
  normId: string;
  status: string;
  assignedUserId: string;
  proposedByUserId: string;
  proposedAt: string;
  confirmedAt: string | null;
  disputeReason: string | null;
  disputedAt: string | null;
  decisionByUserId: string | null;
  decisionAt: string | null;
  decisionNote: string | null;
  norm?: { bezeichnung: string };
};

function reshapeHandshake(h: BackendHandshake, names: Map<string, string>) {
  return {
    id: h.id,
    status: h.status,
    target_person_id: h.assignedUserId,
    proposed_by: h.proposedByUserId,
    proposed_at: h.proposedAt,
    confirmed_at: h.confirmedAt,
    dispute_reason: h.disputeReason,
    disputed_at: h.disputedAt,
    decision_by: h.decisionByUserId,
    decision_at: h.decisionAt,
    decision_note: h.decisionNote,
    target: personRef(names, h.assignedUserId),
    proposer: personRef(names, h.proposedByUserId),
  };
}

export async function getNormZuweisungHandshake(normId: string) {
  const [handshake, names] = await Promise.all([
    apiFetch<BackendHandshake | null>(`/compliance/normen/${normId}/handshake`),
    getUserNameMap(),
  ]);
  return handshake ? reshapeHandshake(handshake, names) : null;
}

/** All Normzuweisung-Handshakes (Rechtsnormenkataster) across the tenant, with the norm's id. */
export async function listNormZuweisungHandshakes() {
  const [handshakes, names] = await Promise.all([
    apiFetch<BackendHandshake[]>("/compliance/normen/handshakes"),
    getUserNameMap(),
  ]);
  return handshakes.map((h) => ({ ...reshapeHandshake(h, names), entity_id: h.normId }));
}

/* =====================================================================
 * Feststellungs- und Maßnahmenregister
 * ===================================================================*/

type BackendFeststellung = {
  id: string;
  normId: string | null;
  titel: string;
  beschreibung: string | null;
  status: string;
  schweregrad: string | null;
  frist: string | null;
  massnahme: string | null;
  quelle: string | null;
  verantwortlichUserId: string | null;
  fachbereichErledigtAm: string | null;
  fachbereichErledigtVon: string | null;
  wirksamkeitBestaetigtAm: string | null;
  wirksamkeitBestaetigtVon: string | null;
  akzeptiertesRisikoEntscheider: string | null;
  akzeptiertesRisikoUeberpruefung: string | null;
  geschlossenAm: string | null;
  geschlossenVon: string | null;
  createdAt: string;
  norm?: { bezeichnung: string } | null;
};

function reshapeFeststellung(f: BackendFeststellung, names: Map<string, string>) {
  return {
    id: f.id,
    norm_id: f.normId,
    titel: f.titel,
    beschreibung: f.beschreibung,
    status: f.status,
    schweregrad: f.schweregrad,
    frist: iso10(f.frist),
    massnahme: f.massnahme,
    quelle: f.quelle,
    verantwortlich_person_id: f.verantwortlichUserId,
    fachbereich_erledigt_am: iso10(f.fachbereichErledigtAm),
    fachbereich_erledigt_von: f.fachbereichErledigtVon,
    wirksamkeit_bestaetigt_am: iso10(f.wirksamkeitBestaetigtAm),
    wirksamkeit_bestaetigt_von: f.wirksamkeitBestaetigtVon,
    akzeptiertes_risiko_entscheider: f.akzeptiertesRisikoEntscheider,
    akzeptiertes_risiko_ueberpruefung: iso10(f.akzeptiertesRisikoUeberpruefung),
    geschlossen_am: iso10(f.geschlossenAm),
    geschlossen_von: f.geschlossenVon,
    created_at: f.createdAt,
    verantwortlich: personRef(names, f.verantwortlichUserId),
  };
}

/** Cross-tenant Feststellungs- und Massnahmenregister (all norms), for the dedicated register
 * page and for dashboard aggregates — unlike listFeststellungenForNorm, not scoped to one norm. */
export async function listFeststellungen() {
  const [feststellungen, names] = await Promise.all([
    apiFetch<BackendFeststellung[]>("/compliance/feststellungen"),
    getUserNameMap(),
  ]);
  return feststellungen.map((f) => ({ ...reshapeFeststellung(f, names), normen: f.norm ? { bezeichnung: f.norm.bezeichnung } : null }));
}

export async function listFeststellungenForNorm(normId: string) {
  const [feststellungen, names] = await Promise.all([
    apiFetch<BackendFeststellung[]>(`/compliance/feststellungen/for-norm/${normId}`),
    getUserNameMap(),
  ]);
  return feststellungen.map((f) => reshapeFeststellung(f, names));
}

/* =====================================================================
 * Risiken & Kontrollen (Tz. 1) — read-only reference registers
 * ===================================================================*/

type BackendRisiko = {
  id: string;
  nr: string | null;
  bezeichnung: string;
  eintrittswahrscheinlichkeit: string | null;
  auswirkung: string | null;
  inhaerent: string | null;
  kontrollbewertung: string | null;
  restrisiko: string | null;
  massnahme: string | null;
  verantwortlichUserId: string | null;
};

export async function listRisiken() {
  const [risiken, names] = await Promise.all([apiFetch<BackendRisiko[]>("/compliance/reference/risiken"), getUserNameMap()]);
  return risiken.map((r) => ({
    id: r.id,
    nr: r.nr,
    bezeichnung: r.bezeichnung,
    eintrittswahrscheinlichkeit: r.eintrittswahrscheinlichkeit,
    auswirkung: r.auswirkung,
    inhaerent: r.inhaerent,
    kontrollbewertung: r.kontrollbewertung,
    restrisiko: r.restrisiko,
    massnahme: r.massnahme,
    verantwortlich_person_id: r.verantwortlichUserId,
    verantwortlich: personRef(names, r.verantwortlichUserId),
  }));
}

type BackendKontrolle = {
  id: string;
  normId: string | null;
  verfahren: string;
  prozess: string | null;
  turnus: string | null;
  letzteDurchfuehrung: string | null;
  naechsteFaelligkeit: string | null;
  wirksamkeit: string | null;
  verantwortlichUserId: string | null;
  autorUserId: string | null;
  freigegebenVonUserId: string | null;
  freigegebenAm: string | null;
  norm?: { bezeichnung: string } | null;
};

export async function listKontrollen() {
  const [kontrollen, names] = await Promise.all([apiFetch<BackendKontrolle[]>("/compliance/reference/kontrollen"), getUserNameMap()]);
  return kontrollen.map((k) => ({
    id: k.id,
    norm_id: k.normId,
    verfahren: k.verfahren,
    prozess: k.prozess,
    turnus: k.turnus,
    letzte_durchfuehrung: iso10(k.letzteDurchfuehrung),
    naechste_faelligkeit: iso10(k.naechsteFaelligkeit),
    wirksamkeit: k.wirksamkeit,
    verantwortlich_person_id: k.verantwortlichUserId,
    normen: k.norm ? { bezeichnung: k.norm.bezeichnung } : null,
    verantwortlich: personRef(names, k.verantwortlichUserId),
  }));
}

export async function listNormRisikenLinks() {
  const links = await apiFetch<{ normId: string; risikoId: string; norm: { bezeichnung: string }; risiko: { nr: string | null; bezeichnung: string } }[]>(
    "/compliance/reference/norm-risiken"
  );
  return links.map((l) => ({
    norm_id: l.normId,
    risiko_id: l.risikoId,
    normen: { bezeichnung: l.norm.bezeichnung },
    risiken: { nr: l.risiko.nr, bezeichnung: l.risiko.bezeichnung },
  }));
}

export async function listRisikoKontrollenLinks() {
  const links = await apiFetch<{ risikoId: string; kontrolleId: string }[]>("/compliance/reference/risiko-kontrollen");
  return links.map((l) => ({ risiko_id: l.risikoId, kontrolle_id: l.kontrolleId }));
}

export async function listBeratung() {
  const rows = await apiFetch<{ id: string; datum: string; thema: string; adressat: string | null; format: string | null; nachweisText: string | null }[]>(
    "/compliance/reference/beratung"
  );
  return rows.map((b) => ({ id: b.id, datum: iso10(b.datum)!, thema: b.thema, adressat: b.adressat, format: b.format, nachweis_text: b.nachweisText }));
}

/* =====================================================================
 * Nachweis-Ablage
 * ===================================================================*/

type BackendNachweis = {
  id: string;
  entityType: string;
  entityId: string | null;
  dateiname: string;
  fileRef: string | null;
  hash: string | null;
  aufbewahrungsfrist: string | null;
  previousVersionId: string | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
};

export async function listNachweise() {
  const [nachweise, names] = await Promise.all([
    apiFetch<BackendNachweis[]>("/nachweise?module=COMPLIANCE"),
    getUserNameMap(),
  ]);
  return nachweise.map((n) => ({
    id: n.id,
    entity_type: n.entityType,
    entity_id: n.entityId,
    dateiname: n.dateiname,
    file_ref: n.fileRef,
    hash: n.hash,
    aufbewahrungsfrist: n.aufbewahrungsfrist,
    previous_version_id: n.previousVersionId,
    uploaded_by: n.uploadedByUserId,
    uploaded_at: n.uploadedAt,
    uploader: personRef(names, n.uploadedByUserId),
  }));
}

/* =====================================================================
 * Governance (Tz. 3-4)
 * ===================================================================*/

export async function listBeauftragte() {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; funktion: string; rechtsgrundlage: string | null; inhaberUserId: string | null; stellvertretungUserId: string | null; bestelltAm: string | null; anzeigeAufsicht: boolean }[]
    >("/compliance/reference/beauftragte"),
    getUserNameMap(),
  ]);
  return rows.map((b) => ({
    id: b.id,
    funktion: b.funktion,
    rechtsgrundlage: b.rechtsgrundlage,
    inhaber_person_id: b.inhaberUserId,
    stellvertretung_person_id: b.stellvertretungUserId,
    bestellt_am: iso10(b.bestelltAm),
    anzeige_aufsicht: b.anzeigeAufsicht,
    inhaber: personRef(names, b.inhaberUserId),
    stellvertretung: personRef(names, b.stellvertretungUserId),
  }));
}

export async function listFunktionswechsel() {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; funktionId: string | null; datum: string; bisherText: string | null; neuUserId: string | null; beschluss: string | null; anzeigeAufsicht: boolean; funktion: { funktion: string } | null }[]
    >("/compliance/reference/funktionswechsel"),
    getUserNameMap(),
  ]);
  return rows.map((c) => ({
    id: c.id,
    funktion_id: c.funktionId,
    datum: iso10(c.datum)!,
    bisher_text: c.bisherText,
    neu_person_id: c.neuUserId,
    beschluss: c.beschluss,
    anzeige_aufsicht: c.anzeigeAufsicht,
    funktion: c.funktion ? { funktion: c.funktion.funktion } : null,
    neu: personRef(names, c.neuUserId),
  }));
}

export async function listErleichterungen() {
  const rows = await apiFetch<
    {
      id: string;
      gegenstand: string;
      rechtsgrundlage: string | null;
      gewaehrtDurch: string | null;
      gewaehrtAm: string | null;
      aktenzeichen: string | null;
      reichweite: string | null;
      formalErleichtert: boolean;
      materiellErfuellt: boolean;
      begruendung: string | null;
      ueberpruefung: string | null;
    }[]
  >("/compliance/reference/erleichterungen");
  return rows.map((e) => ({
    id: e.id,
    gegenstand: e.gegenstand,
    rechtsgrundlage: e.rechtsgrundlage,
    gewaehrt_durch: e.gewaehrtDurch,
    gewaehrt_am: iso10(e.gewaehrtAm),
    aktenzeichen: e.aktenzeichen,
    reichweite: e.reichweite,
    formal_erleichtert: e.formalErleichtert,
    materiell_erfuellt: e.materiellErfuellt,
    begruendung: e.begruendung,
    ueberpruefung: iso10(e.ueberpruefung),
  }));
}

export async function listStellenbeschreibungen() {
  const rows = await apiFetch<
    { id: string; dokument: string; fassung: string | null; genehmigtDurchUserId: string | null; genehmigtAm: string | null; naechsteUeberpruefung: string | null }[]
  >("/compliance/reference/stellenbeschreibungen");
  return rows.map((j) => ({
    id: j.id,
    dokument: j.dokument,
    fassung: j.fassung,
    genehmigt_durch_person_id: j.genehmigtDurchUserId,
    genehmigt_am: iso10(j.genehmigtAm),
    naechste_ueberpruefung: iso10(j.naechsteUeberpruefung),
  }));
}

export async function getGovernanceSettings() {
  const settings = await apiFetch<
    { sonderfallKleinesInstitut: boolean; interessenkonfliktMassnahmen: string | null; kombinationRationale: string | null; ressourcenausstattung: string | null } | null
  >("/compliance/governance");
  if (!settings) return null;
  return {
    sonderfall_kleines_institut: settings.sonderfallKleinesInstitut,
    interessenkonflikt_massnahmen: settings.interessenkonfliktMassnahmen,
    kombination_rationale: settings.kombinationRationale,
    ressourcenausstattung: settings.ressourcenausstattung,
  };
}

/* =====================================================================
 * Informationsrechte (Tz. 5)
 * ===================================================================*/

export async function listGremien() {
  const rows = await apiFetch<{ id: string; typ: string; bezeichnung: string; grundlage: string | null; turnus: string | null; letzterEingang: string | null }[]>(
    "/compliance/reference/gremien"
  );
  return rows.map((g) => ({ id: g.id, typ: g.typ, bezeichnung: g.bezeichnung, grundlage: g.grundlage, turnus: g.turnus, letzter_eingang: iso10(g.letzterEingang) }));
}

export async function listEreignisse() {
  const rows = await apiFetch<{ id: string; datum: string; ausloeser: string | null; gegenstand: string; beteiligung: string | null; votum: string | null }[]>(
    "/compliance/reference/ereignisse"
  );
  return rows.map((e) => ({ id: e.id, datum: iso10(e.datum)!, ausloeser: e.ausloeser, gegenstand: e.gegenstand, beteiligung: e.beteiligung, votum: e.votum }));
}

/* =====================================================================
 * Bericht an die Geschaeftsleitung (Tz. 6) + Compliance-Rating
 * ===================================================================*/

export async function listRatings() {
  const rows = await apiFetch<{ id: string; periode: string; rating: string; begruendung: string | null; erfasstAm: string }[]>(
    "/compliance/ratings"
  );
  return rows.map((r) => ({ id: r.id, periode: r.periode, rating: r.rating, begruendung: r.begruendung, erfasst_am: iso10(r.erfasstAm)! }));
}

export type ReportAcknowledgement = { userId: string; acknowledgedAt: string; name: string };

type BackendReport = {
  id: string;
  reportType: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  content: Record<string, unknown>;
  finalizedAt: string | null;
  acknowledgements: { userId: string; acknowledgedAt: string }[];
};

export async function listReports() {
  const [reports, names] = await Promise.all([apiFetch<BackendReport[]>("/compliance/reports"), getUserNameMap()]);
  return reports.map((r) => ({
    id: r.id,
    report_type: r.reportType,
    period_from: iso10(r.periodFrom),
    period_to: iso10(r.periodTo),
    status: r.status,
    content: r.content,
    finalized_at: r.finalizedAt,
    acknowledgements: r.acknowledgements.map((a) => ({ userId: a.userId, acknowledgedAt: a.acknowledgedAt, name: names.get(a.userId) ?? "—" })),
  }));
}

/* =====================================================================
 * Audit-Trail
 * ===================================================================*/

export async function listAuditLog() {
  const events = await apiFetch<{ id: string; action: string; entityType: string; timestamp: string; changedFields: string[] | null }[]>(
    "/audit-log?module=compliance"
  );
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    entity_type: e.entityType,
    occurred_at: e.timestamp,
    details: { object: (e.changedFields ?? []).join(", ") || e.entityType },
  }));
}
