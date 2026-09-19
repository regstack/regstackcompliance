import { cache } from "react";
import { apiFetch } from "@/lib/regstack/backend-client";

// Pure helpers (riskScore, cycleYears, findingStage, ...) live in revisions-utils.ts, which has
// no server-only dependency, and are re-exported here so existing Server Component imports from
// "@/lib/regstack/revisions" keep working. Client Components must import them from
// "@/lib/regstack/revisions-utils"/"revisions-universum" directly instead of from this module.
export * from "@/lib/regstack/revisions-utils";

// ---------------------------------------------------------------------------
// Adapter: the backend returns camelCase Prisma shapes; every page/component in this app was
// written against the Supabase-era snake_case shapes with embedded `{ full_name }`/`{ subject }`
// objects. Read functions below reshape backend responses back into that exact shape, the same
// approach the Outsourcing and Compliance migrations used.
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
 * Prüfungsuniversum & Plan (Tz. 6)
 * ===================================================================*/

type BackendUniversum = {
  id: string;
  bezeichnung: string;
  bereich: string | null;
  category: string;
  outsourced: boolean;
  materiality: string | null;
  risikokriterien: unknown;
  riskRationale: unknown;
  regAnker: string | null;
  verantwortlichUserId: string | null;
  status: string;
  riskReviewDate: string | null;
  riskReviewReviewerUserId: string | null;
  lastAuditDate: string | null;
  planYear: number | null;
  createdAt: string;
};

function reshapeUniversum(u: BackendUniversum, names: Map<string, string>) {
  return {
    id: u.id,
    bezeichnung: u.bezeichnung,
    bereich: u.bereich,
    category: u.category,
    outsourced: u.outsourced,
    materiality: u.materiality,
    risikokriterien: u.risikokriterien,
    risk_rationale: u.riskRationale,
    reg_anker: u.regAnker,
    verantwortlicher_person_id: u.verantwortlichUserId,
    status: u.status,
    risk_review_date: iso10(u.riskReviewDate),
    risk_review_reviewer_person_id: u.riskReviewReviewerUserId,
    last_audit_date: iso10(u.lastAuditDate),
    plan_year: u.planYear,
    created_at: u.createdAt,
    verantwortlicher: personRef(names, u.verantwortlichUserId),
    risk_reviewer: personRef(names, u.riskReviewReviewerUserId),
  };
}

export async function listUniversum() {
  const [items, names] = await Promise.all([apiFetch<BackendUniversum[]>("/revisions/universum"), getUserNameMap()]);
  return items.map((u) => reshapeUniversum(u, names));
}

export async function getUniversumItem(id: string) {
  const [item, names] = await Promise.all([apiFetch<BackendUniversum>(`/revisions/universum/${id}`), getUserNameMap()]);
  return reshapeUniversum(item, names);
}

type BackendAuditPlan = {
  id: string;
  year: number;
  content: unknown;
  status: string;
  createdByUserId: string | null;
  createdAt: string;
  submittedByUserId: string | null;
  submittedAt: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
};

export async function listAuditPlans() {
  const [plans, names] = await Promise.all([apiFetch<BackendAuditPlan[]>("/revisions/universum/plans"), getUserNameMap()]);
  return plans.map((p) => ({
    id: p.id,
    year: p.year,
    content: p.content,
    status: p.status,
    created_by: p.createdByUserId,
    created_at: p.createdAt,
    submitted_by: p.submittedByUserId,
    submitted_at: p.submittedAt,
    approved_by: p.approvedByUserId,
    approved_at: p.approvedAt,
    approver: personRef(names, p.approvedByUserId),
    creator: personRef(names, p.createdByUserId),
  }));
}

/* =====================================================================
 * Prüfungen: Bericht, Programm, Arbeitspapiere, QS (M3/M4)
 * ===================================================================*/

type BackendPruefung = {
  id: string;
  pruefungsobjektId: string | null;
  subject: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  preparedBy: string | null;
  reportDate: string | null;
  presentedTo: string | null;
  presentedDate: string | null;
  workpaperRef: string | null;
  durchfuehrung: string;
  overallRating: string | null;
  budgetDays: number | null;
  actualDays: number | null;
  externDienstleister: string | null;
  externAblage: string | null;
  externEinsicht: unknown;
  qsChecklist: unknown;
  qsCompletedByUserId: string | null;
  qsCompletedAt: string | null;
  qsReviewedByUserId: string | null;
  qsReviewedAt: string | null;
  createdAt: string;
  pruefungsobjekt?: { bezeichnung: string } | null;
};

function reshapePruefung(p: BackendPruefung, names: Map<string, string>) {
  return {
    id: p.id,
    pruefungsobjekt_id: p.pruefungsobjektId,
    subject: p.subject,
    period_from: iso10(p.periodFrom),
    period_to: iso10(p.periodTo),
    status: p.status,
    prepared_by: p.preparedBy,
    report_date: iso10(p.reportDate),
    presented_to: p.presentedTo,
    presented_date: iso10(p.presentedDate),
    workpaper_ref: p.workpaperRef,
    durchfuehrung: p.durchfuehrung,
    overall_rating: p.overallRating ?? "",
    budget_days: p.budgetDays,
    actual_days: p.actualDays,
    extern_dienstleister: p.externDienstleister,
    extern_ablage: p.externAblage,
    extern_einsicht: p.externEinsicht,
    qs_checkliste: p.qsChecklist,
    qs_completed_by: p.qsCompletedByUserId,
    qs_completed_at: p.qsCompletedAt,
    qs_reviewed_by: p.qsReviewedByUserId,
    qs_reviewed_at: p.qsReviewedAt,
    created_at: p.createdAt,
    pruefungsobjekt: p.pruefungsobjekt ? { bezeichnung: p.pruefungsobjekt.bezeichnung } : null,
    preparer: personRef(names, p.preparedBy),
    qs_completer: personRef(names, p.qsCompletedByUserId),
    qs_reviewer: personRef(names, p.qsReviewedByUserId),
  };
}

export async function listPruefungen() {
  const [items, names] = await Promise.all([apiFetch<BackendPruefung[]>("/revisions/pruefungen"), getUserNameMap()]);
  return items.map((p) => reshapePruefung(p, names));
}

export async function getPruefung(id: string) {
  const [item, names] = await Promise.all([apiFetch<BackendPruefung>(`/revisions/pruefungen/${id}`), getUserNameMap()]);
  return reshapePruefung(item, names);
}

export async function listPruefungZuweisungen(pruefungId: string) {
  const [rows, names] = await Promise.all([
    apiFetch<{ id: string; pruefungId: string; userId: string; role: string; createdAt: string }[]>(`/revisions/pruefungen/${pruefungId}/zuweisungen`),
    getUserNameMap(),
  ]);
  return rows.map((z) => ({
    id: z.id,
    pruefung_id: z.pruefungId,
    person_id: z.userId,
    role: z.role,
    created_at: z.createdAt,
    person: personRef(names, z.userId),
  }));
}

export async function listPruefungsschritte(pruefungId: string) {
  const rows = await apiFetch<
    { id: string; pruefungId: string; nummer: number; bereich: string | null; risiko: string | null; handlung: string | null; sollAussage: string | null; testschritte: string | null; ergebnis: string | null; beurteilung: string | null; createdAt: string }[]
  >(`/revisions/pruefungen/${pruefungId}/schritte`);
  return rows.map((s) => ({
    id: s.id,
    pruefung_id: s.pruefungId,
    nummer: s.nummer,
    bereich: s.bereich,
    risiko: s.risiko,
    handlung: s.handlung,
    soll_aussage: s.sollAussage,
    testschritte: s.testschritte,
    ergebnis: s.ergebnis,
    beurteilung: s.beurteilung ?? "",
    created_at: s.createdAt,
  }));
}

type BackendPaper = {
  id: string;
  schrittId: string;
  nummer: string | null;
  titel: string;
  typ: string | null;
  handlung: string | null;
  erstellerUserId: string | null;
  erstelltAm: string | null;
  inhalt: string | null;
  quelle: string | null;
  stichprobe: unknown;
  ergebnis: string | null;
  reviewerUserId: string | null;
  reviewAm: string | null;
  reviewStatus: string;
  reviewKommentar: string | null;
  createdAt: string;
};

function reshapePaper(p: BackendPaper, names: Map<string, string>) {
  return {
    id: p.id,
    schritt_id: p.schrittId,
    nummer: p.nummer,
    titel: p.titel,
    typ: p.typ,
    handlung: p.handlung,
    ersteller_person_id: p.erstellerUserId,
    erstellt_am: iso10(p.erstelltAm),
    inhalt: p.inhalt,
    quelle: p.quelle,
    stichprobe: p.stichprobe,
    ergebnis: p.ergebnis,
    reviewer_person_id: p.reviewerUserId,
    review_am: iso10(p.reviewAm),
    review_status: p.reviewStatus,
    review_kommentar: p.reviewKommentar,
    created_at: p.createdAt,
    ersteller: personRef(names, p.erstellerUserId),
    reviewer: personRef(names, p.reviewerUserId),
  };
}

export async function listArbeitspapiere(schrittId: string) {
  const [rows, names] = await Promise.all([
    apiFetch<BackendPaper[]>(`/revisions/pruefungen/schritte/${schrittId}/arbeitspapiere`),
    getUserNameMap(),
  ]);
  return rows.map((p) => reshapePaper(p, names));
}

/** All Arbeitspapiere across every Schritt of one Prüfung — used to compute paper-review/
 * self-review counters for the audit-detail header without N+1 fetches. Takes the pruefungId
 * directly now (the backend joins through the Schritt itself), not a pre-computed schrittId[]. */
export async function listArbeitspapiereForPruefung(pruefungId: string) {
  const rows = await apiFetch<Pick<BackendPaper, "id" | "schrittId" | "titel" | "reviewerUserId" | "erstellerUserId" | "reviewStatus">[]>(
    `/revisions/pruefungen/${pruefungId}/arbeitspapiere`
  );
  return rows.map((p) => ({
    id: p.id,
    schritt_id: p.schrittId,
    titel: p.titel,
    reviewer_person_id: p.reviewerUserId,
    ersteller_person_id: p.erstellerUserId,
    review_status: p.reviewStatus,
  }));
}

export async function listNachweiseFor(entityType: string, entityId: string) {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; entityType: string; entityId: string | null; dateiname: string; fileRef: string | null; hash: string | null; aufbewahrungsfrist: string | null; uploadedByUserId: string | null; uploadedAt: string }[]
    >(`/nachweise?module=INTERNAL_AUDIT&entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`),
    getUserNameMap(),
  ]);
  return rows.map((n) => ({
    id: n.id,
    entity_type: n.entityType,
    entity_id: n.entityId,
    dateiname: n.dateiname,
    file_ref: n.fileRef,
    hash: n.hash,
    aufbewahrungsfrist: n.aufbewahrungsfrist,
    uploaded_by: n.uploadedByUserId,
    uploaded_at: n.uploadedAt,
    uploader: personRef(names, n.uploadedByUserId),
  }));
}

/* =====================================================================
 * Feststellungen (M5): Nachverfolgung, Eskalation, Fristenhistorie
 * ===================================================================*/

type BackendFristverlaengerung = {
  id: string;
  feststellungId: string;
  alt: string | null;
  neu: string;
  antragsteller: string | null;
  genehmiger: string | null;
  begruendung: string | null;
  datum: string;
  createdAt: string;
};

function reshapeFrist(f: BackendFristverlaengerung, names: Map<string, string>) {
  return {
    id: f.id,
    feststellung_id: f.feststellungId,
    alt: iso10(f.alt),
    neu: iso10(f.neu)!,
    antragsteller: f.antragsteller,
    genehmiger: f.genehmiger,
    begruendung: f.begruendung,
    datum: iso10(f.datum)!,
    created_at: f.createdAt,
    // `genehmiger` is a userId (matches the original Supabase embed genehmiger_person:genehmiger(full_name))
    genehmiger_person: personRef(names, f.genehmiger),
  };
}

type BackendFeststellung = {
  id: string;
  pruefungsobjektId: string | null;
  pruefungId: string | null;
  titel: string;
  beschreibung: string | null;
  schweregrad: string | null;
  status: string;
  abschlussArt: string | null;
  verantwortlichUserId: string | null;
  fristUrspruenglich: string | null;
  executiveTarget: boolean;
  execEscalation: unknown;
  escalation: unknown;
  nachschauNeeded: boolean;
  nachschauDate: string | null;
  stellungnahme: unknown;
  abschluss: unknown;
  massnahmeErledigtAm: string | null;
  massnahmeErledigtVon: string | null;
  geschlossenAm: string | null;
  geschlossenVon: string | null;
  createdAt: string;
  pruefungsobjekt?: { bezeichnung: string; verantwortlichUserId?: string | null } | null;
  pruefung?: { subject: string } | null;
  fristverlaengerungen?: BackendFristverlaengerung[];
};

function reshapeFeststellung(f: BackendFeststellung, names: Map<string, string>) {
  return {
    id: f.id,
    pruefungsobjekt_id: f.pruefungsobjektId,
    pruefung_id: f.pruefungId,
    titel: f.titel,
    beschreibung: f.beschreibung,
    schweregrad: f.schweregrad,
    status: f.status,
    abschluss_art: f.abschlussArt,
    verantwortlich_person_id: f.verantwortlichUserId,
    frist_urspruenglich: iso10(f.fristUrspruenglich),
    executive_target: f.executiveTarget,
    exec_escalation: f.execEscalation,
    escalation: f.escalation,
    nachschau_needed: f.nachschauNeeded,
    nachschau_date: iso10(f.nachschauDate),
    stellungnahme: f.stellungnahme,
    abschluss: f.abschluss,
    massnahme_erledigt_am: iso10(f.massnahmeErledigtAm),
    massnahme_erledigt_von: f.massnahmeErledigtVon,
    geschlossen_am: iso10(f.geschlossenAm),
    geschlossen_von: f.geschlossenVon,
    created_at: f.createdAt,
    pruefungsobjekt: f.pruefungsobjekt
      ? { bezeichnung: f.pruefungsobjekt.bezeichnung, verantwortlicher_person_id: f.pruefungsobjekt.verantwortlichUserId ?? null }
      : null,
    pruefung: f.pruefung ? { subject: f.pruefung.subject } : null,
    verantwortlich: personRef(names, f.verantwortlichUserId),
    fristverlaengerungen: (f.fristverlaengerungen ?? []).map((fr) => reshapeFrist(fr, names)),
  };
}

export async function listFeststellungen() {
  const [rows, names] = await Promise.all([apiFetch<BackendFeststellung[]>("/revisions/feststellungen"), getUserNameMap()]);
  return rows.map((f) => reshapeFeststellung(f, names));
}

export async function listFeststellungenForPruefung(pruefungId: string) {
  const [rows, names] = await Promise.all([
    apiFetch<BackendFeststellung[]>(`/revisions/feststellungen/for-pruefung/${pruefungId}`),
    getUserNameMap(),
  ]);
  return rows.map((f) => reshapeFeststellung(f, names));
}

export async function listFristverlaengerungen(feststellungId: string) {
  const [rows, names] = await Promise.all([
    apiFetch<BackendFristverlaengerung[]>(`/revisions/feststellungen/${feststellungId}/fristverlaengerung`),
    getUserNameMap(),
  ]);
  return rows.map((f) => reshapeFrist(f, names));
}

/* =====================================================================
 * Quartals- & Jahresbericht (Tz. 9) — generischer reports-Motor
 * ===================================================================*/

type BackendRevisionReport = {
  id: string;
  reportType: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: string;
  content: unknown;
  createdByUserId: string | null;
  createdAt: string;
  finalizedAt: string | null;
  kenntnisnahmeByUserId: string | null;
  kenntnisnahmeAt: string | null;
};

function reshapeReport(r: BackendRevisionReport, names: Map<string, string>) {
  return {
    id: r.id,
    report_type: r.reportType,
    period_from: iso10(r.periodFrom),
    period_to: iso10(r.periodTo),
    status: r.status,
    content: r.content,
    created_by: r.createdByUserId,
    created_at: r.createdAt,
    finalized_at: r.finalizedAt,
    kenntnisnahme_by: r.kenntnisnahmeByUserId,
    kenntnisnahme_at: r.kenntnisnahmeAt,
    kenntnisnehmer: personRef(names, r.kenntnisnahmeByUserId),
  };
}

export async function listReports(reportType?: "quartalsbericht" | "jahresbericht") {
  const qs = reportType ? `?reportType=${reportType}` : "";
  const [rows, names] = await Promise.all([apiFetch<BackendRevisionReport[]>(`/revisions/reports${qs}`), getUserNameMap()]);
  return rows.map((r) => reshapeReport(r, names));
}

export async function getReport(id: string) {
  const [report, names] = await Promise.all([apiFetch<BackendRevisionReport>(`/revisions/reports/${id}`), getUserNameMap()]);
  return reshapeReport(report, names);
}

/* =====================================================================
 * Personal, Schulungen & Sperrfristen (M8, Tz. 3-4)
 * ===================================================================*/

export async function listRevisionPersonal() {
  const [rows, names] = await Promise.all([
    apiFetch<{ userId: string; qualifikation: string | null; sollFortbildungTage: number | null; nonAuditTasks: string | null; advisoryActive: boolean; advisorySafeguard: string | null; updatedAt: string }[]>(
      "/revisions/personal"
    ),
    getUserNameMap(),
  ]);
  return rows.map((p) => ({
    person_id: p.userId,
    qualifikation: p.qualifikation,
    soll_fortbildung_tage: p.sollFortbildungTage ?? 0,
    non_audit_tasks: p.nonAuditTasks,
    advisory_active: p.advisoryActive,
    advisory_safeguard: p.advisorySafeguard,
    updated_at: p.updatedAt,
    // org_unit has no backend equivalent (it lived on Supabase's `persons` table, which this
    // migration doesn't carry over) — kept in the shape as null so consumers don't break.
    person: { full_name: names.get(p.userId) ?? "—", org_unit: null as string | null },
  }));
}

export async function listRevisionSchulungen() {
  const [rows, names] = await Promise.all([
    apiFetch<{ id: string; userId: string; titel: string; datum: string; umfang: number | null; nachweisText: string | null; createdAt: string }[]>(
      "/revisions/personal/schulungen"
    ),
    getUserNameMap(),
  ]);
  return rows.map((s) => ({
    id: s.id,
    person_id: s.userId,
    titel: s.titel,
    datum: iso10(s.datum)!,
    umfang: s.umfang,
    nachweis_text: s.nachweisText,
    created_at: s.createdAt,
    person: personRef(names, s.userId),
  }));
}

export async function listSperrfristen() {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; userId: string | null; name: string | null; fromUnit: string | null; transferDate: string | null; barredAreas: string | null; barEndDate: string | null; deviation: boolean; deviationReason: string | null; createdAt: string }[]
    >("/revisions/personal/sperrfristen"),
    getUserNameMap(),
  ]);
  return rows.map((s) => ({
    id: s.id,
    person_id: s.userId,
    name: s.name,
    from_unit: s.fromUnit,
    transfer_date: iso10(s.transferDate),
    barred_areas: s.barredAreas,
    bar_end_date: iso10(s.barEndDate),
    deviation: s.deviation,
    deviation_reason: s.deviationReason,
    created_at: s.createdAt,
    person: personRef(names, s.userId),
  }));
}

export async function listSonderwissen() {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; userId: string | null; name: string | null; fromUnit: string | null; topic: string | null; pruefungId: string | null; durationText: string | null; createdAt: string; pruefung?: { subject: string } | null }[]
    >("/revisions/personal/sonderwissen"),
    getUserNameMap(),
  ]);
  return rows.map((s) => ({
    id: s.id,
    person_id: s.userId,
    name: s.name,
    from_unit: s.fromUnit,
    topic: s.topic,
    pruefung_id: s.pruefungId,
    duration_text: s.durationText,
    created_at: s.createdAt,
    person: personRef(names, s.userId),
    pruefung: s.pruefung ? { subject: s.pruefung.subject } : null,
  }));
}

/* =====================================================================
 * Governance, Qualitätssicherung & Projekte (Tz. 1-2)
 * ===================================================================*/

export async function getRevisionEinstellungen() {
  const [settings, names] = await Promise.all([
    apiFetch<
      | {
          orgForm: string | null;
          disproportionalityReason: string | null;
          conflictMeasures: string | null;
          headOfAuditUserId: string | null;
          directSubordination: boolean;
          independenceConfirmed: boolean;
          severitySettings: unknown;
          angemesseneZeitTage: number;
          qsIntervallMonate: number | null;
          risikoReviewIntervallMonate: number | null;
          updatedAt: string;
        }
      | null
    >("/revisions/governance/einstellungen"),
    getUserNameMap(),
  ]);
  if (!settings) return null;
  return {
    org_form: settings.orgForm,
    disproportionality_reason: settings.disproportionalityReason,
    conflict_measures: settings.conflictMeasures,
    head_of_audit_person_id: settings.headOfAuditUserId,
    direct_subordination: settings.directSubordination,
    independence_confirmed: settings.independenceConfirmed,
    severity_settings: settings.severitySettings,
    angemessene_zeit_tage: settings.angemesseneZeitTage,
    qs_intervall_monate: settings.qsIntervallMonate,
    risiko_review_intervall_monate: settings.risikoReviewIntervallMonate,
    updated_at: settings.updatedAt,
    head_of_audit: personRef(names, settings.headOfAuditUserId),
  };
}

export async function listQualitaetssicherung() {
  const rows = await apiFetch<{ id: string; date: string; type: string; anlass: string | null; scope: unknown; reviewer: string | null; result: string | null; nextDue: string | null; createdAt: string }[]>(
    "/revisions/governance/qs"
  );
  return rows.map((q) => ({
    id: q.id,
    date: iso10(q.date)!,
    type: q.type,
    anlass: q.anlass,
    scope: q.scope,
    reviewer: q.reviewer,
    result: q.result,
    next_due: iso10(q.nextDue),
    created_at: q.createdAt,
  }));
}

export async function listProjektbegleitung() {
  const [rows, names] = await Promise.all([
    apiFetch<
      { id: string; name: string; role: string | null; startDate: string | null; endDate: string | null; status: string; irContactUserId: string | null; accessGranted: boolean; notes: string | null; createdAt: string }[]
    >("/revisions/governance/projektbegleitung"),
    getUserNameMap(),
  ]);
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role ?? "",
    start_date: iso10(p.startDate),
    end_date: iso10(p.endDate),
    status: p.status,
    ir_contact_person_id: p.irContactUserId,
    access_granted: p.accessGranted,
    notes: p.notes,
    created_at: p.createdAt,
    ir_contact: personRef(names, p.irContactUserId),
  }));
}

export async function listZugriffsvorfaelle() {
  const rows = await apiFetch<{ id: string; date: string; area: string | null; description: string | null; escalatedTo: string | null; resolvedDate: string | null; createdAt: string }[]>(
    "/revisions/governance/zugriffsvorfaelle"
  );
  return rows.map((v) => ({
    id: v.id,
    date: iso10(v.date)!,
    area: v.area,
    description: v.description,
    escalated_to: v.escalatedTo,
    resolved_date: iso10(v.resolvedDate),
    created_at: v.createdAt,
  }));
}

export async function listGlMitteilungen() {
  const rows = await apiFetch<{ id: string; date: string; decision: string; createdAt: string }[]>("/revisions/governance/gl-mitteilungen");
  return rows.map((m) => ({ id: m.id, date: iso10(m.date)!, decision: m.decision, created_at: m.createdAt }));
}

export async function listSonderauftraege() {
  const rows = await apiFetch<{ id: string; date: string; orderedBy: string | null; subject: string; reason: string | null; createdAt: string }[]>(
    "/revisions/governance/sonderauftraege"
  );
  return rows.map((s) => ({ id: s.id, date: iso10(s.date)!, ordered_by: s.orderedBy, subject: s.subject, reason: s.reason, created_at: s.createdAt }));
}

/* =====================================================================
 * Externe Prüfung — der jährliche Bericht des externen Prüfers (Wirtschaftsprüfer/
 * Bankenaufsicht) an die Geschäftsleitung. Interne Revision erfasst ihn hier und verteilt
 * seine Feststellungen an die zuständigen Fachbereiche/Module zur Nachverfolgung.
 * ===================================================================*/

type BackendExternePruefungFeststellung = {
  id: string;
  externePruefungId: string;
  titel: string;
  beschreibung: string | null;
  schweregrad: string | null;
  frist: string | null;
  modul: string | null;
  fachbereich: string | null;
  verantwortlichUserId: string | null;
  status: string;
  verteiltAm: string | null;
  verteiltVon: string | null;
  fachbereichErledigtAm: string | null;
  fachbereichErledigtVon: string | null;
  wirksamkeitBestaetigtAm: string | null;
  wirksamkeitBestaetigtVon: string | null;
  geschlossenAm: string | null;
  geschlossenVon: string | null;
  createdAt: string;
  externePruefung?: { pruefer: string; jahr: number } | null;
};

function reshapeExternePruefungFeststellung(f: BackendExternePruefungFeststellung, names: Map<string, string>) {
  return {
    id: f.id,
    externe_pruefung_id: f.externePruefungId,
    titel: f.titel,
    beschreibung: f.beschreibung,
    schweregrad: f.schweregrad,
    frist: iso10(f.frist),
    modul: f.modul,
    fachbereich: f.fachbereich,
    verantwortlich_person_id: f.verantwortlichUserId,
    status: f.status,
    verteilt_am: iso10(f.verteiltAm),
    fachbereich_erledigt_am: iso10(f.fachbereichErledigtAm),
    wirksamkeit_bestaetigt_am: iso10(f.wirksamkeitBestaetigtAm),
    geschlossen_am: iso10(f.geschlossenAm),
    created_at: f.createdAt,
    verantwortlich: personRef(names, f.verantwortlichUserId),
    externe_pruefung: f.externePruefung ? { pruefer: f.externePruefung.pruefer, jahr: f.externePruefung.jahr } : null,
  };
}

type BackendExternePruefung = {
  id: string;
  pruefer: string;
  jahr: number;
  berichtsdatum: string | null;
  glKenntnisnahmeByUserId: string | null;
  glKenntnisnahmeAt: string | null;
  createdAt: string;
  feststellungen: BackendExternePruefungFeststellung[];
};

export async function listExternePruefungen() {
  const [rows, names] = await Promise.all([apiFetch<BackendExternePruefung[]>("/revisions/externe-pruefungen"), getUserNameMap()]);
  return rows.map((p) => ({
    id: p.id,
    pruefer: p.pruefer,
    jahr: p.jahr,
    berichtsdatum: iso10(p.berichtsdatum),
    gl_kenntnisnahme_am: iso10(p.glKenntnisnahmeAt),
    created_at: p.createdAt,
    feststellungen: p.feststellungen.map((f) => reshapeExternePruefungFeststellung(f, names)),
  }));
}

/** Für die "Meine offenen Feststellungen"-Ansicht im jeweiligen Modul — nur die dem aktuellen
 * Nutzer zugewiesenen, noch nicht geschlossenen Feststellungen aus externen Prüfungen. */
export async function listOffeneExternePruefungFeststellungenFuerMich() {
  const [rows, names] = await Promise.all([
    apiFetch<BackendExternePruefungFeststellung[]>("/revisions/externe-pruefungen/feststellungen/all?assignedToMe=true"),
    getUserNameMap(),
  ]);
  return rows.filter((f) => f.status !== "geschlossen").map((f) => reshapeExternePruefungFeststellung(f, names));
}

/* =====================================================================
 * Audit-Trail
 * ===================================================================*/

export async function listAuditLog() {
  const events = await apiFetch<{ id: string; action: string; entityType: string; timestamp: string; changedFields: string[] | null }[]>(
    "/audit-log?module=internal_audit"
  );
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    entity_type: e.entityType,
    occurred_at: e.timestamp,
    details: { object: (e.changedFields ?? []).join(", ") || e.entityType },
  }));
}
