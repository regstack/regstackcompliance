import { apiFetch } from "@/lib/regstack/backend-client";
import type { RisikoartKategorie } from "@/lib/regstack/risikomanagement-labels";

// Client Components must import RISIKOART_LABELS/RisikoartKategorie from
// "@/lib/regstack/risikomanagement-labels" directly instead of from this module, since importing
// any value from here pulls the server-only backend client into the browser bundle.
export * from "@/lib/regstack/risikomanagement-labels";

export type RmWesentlichkeit = "wesentlich" | "nicht_wesentlich";

export type Risikoinventur = {
  id: string;
  jahr: number;
  kategorie: RisikoartKategorie;
  bezeichnung: string;
  wesentlichkeit: RmWesentlichkeit;
  begruendung: string | null;
  methodik: string | null;
  verantwortlichUserId: string | null;
  letzteUeberpruefung: string | null;
  naechsteUeberpruefung: string | null;
};

export type RmStrategieArt = "geschaeftsstrategie" | "risikostrategie" | "teilstrategie";
export type RmStrategieStatus = "entwurf" | "verabschiedet";

export type Risikostrategie = {
  id: string;
  art: RmStrategieArt;
  jahr: number;
  inhalt: Record<string, unknown>;
  status: RmStrategieStatus;
  verabschiedetAm: string | null;
  verabschiedetVonUserId: string | null;
  naechsteUeberpruefung: string | null;
};

export type RtfAnsatz = "normativ" | "oekonomisch";

export type RtfLimit = { limitProzent?: number; auslastungProzent?: number };

export type Risikotragfaehigkeit = {
  id: string;
  periode: string;
  ansatz: RtfAnsatz;
  risikodeckungspotenzial: number | null;
  limits: Partial<Record<RisikoartKategorie, RtfLimit>>;
  auslastungGesamt: number | null;
  ergebnis: string | null;
  methodenpruefungAm: string | null;
  freigegebenVonUserId: string | null;
  freigegebenAm: string | null;
};

export type RmReportStatus = "entwurf" | "final";

export type RmReport = {
  id: string;
  reportType: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: RmReportStatus;
  content: { kapitalausstattung?: string; risikolage?: string; massnahmen?: string };
  finalizedAt: string | null;
  acknowledgements: { id: string; userId: string; acknowledgedAt: string }[];
};

export async function listRisikoinventur() {
  return apiFetch<Risikoinventur[]>("/risikomanagement/inventur");
}

export async function listRisikostrategien() {
  return apiFetch<Risikostrategie[]>("/risikomanagement/strategien");
}

export async function listRisikotragfaehigkeit() {
  return apiFetch<Risikotragfaehigkeit[]>("/risikomanagement/risikotragfaehigkeit");
}

export async function listRmReports() {
  return apiFetch<RmReport[]>("/risikomanagement/reports");
}

export type AufsichtsorganBerichtStatus = "entwurf" | "final" | "versendet";

// AT 3.2 — eigenes Berichtsziel/-publikum (das Aufsichtsorgan), verschieden vom GL-internen
// RmReport oben. "versendet" dokumentiert die tatsächliche Übermittlung, da das Aufsichtsorgan
// selbst keinen RegStack-Login hat.
export type AufsichtsorganBericht = {
  id: string;
  periodFrom: string | null;
  periodTo: string | null;
  status: AufsichtsorganBerichtStatus;
  content: { geschaeftslage?: string; risikosituation?: string; strategien?: string; complianceBericht?: string; revisionsberichte?: string };
  finalizedAt: string | null;
  versendetAm: string | null;
};

export async function listAufsichtsorganBerichte() {
  return apiFetch<AufsichtsorganBericht[]>("/risikomanagement/aufsichtsorganberichte");
}
