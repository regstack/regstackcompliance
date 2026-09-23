import { apiFetch } from "@/lib/regstack/backend-client";
import type {
  RisikoartKategorie,
  RmStresstestTyp,
  RmStresstestEbene,
} from "@/lib/regstack/risikomanagement-labels";

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

export type RmKapitalplanung = {
  id: string;
  jahr: number;
  planungshorizontJahre: number;
  kapitalbedarfPlanung: Record<string, number>;
  verfuegbaresKapitalPlanung: Record<string, number>;
  adverseSzenarienBeruecksichtigt: boolean;
  konsistenzGeschaeftsplanung: string | null;
  anlassbezogenAktualisiertAm: string | null;
  verabschiedetAm: string | null;
  verabschiedetVonUserId: string | null;
};

export async function listRmKapitalplanung() {
  return apiFetch<RmKapitalplanung[]>("/risikomanagement/kapitalplanung");
}

export type RmStresstest = {
  id: string;
  jahr: number;
  typ: RmStresstestTyp;
  ebene: RmStresstestEbene;
  betroffeneRisikoarten: RisikoartKategorie[];
  szenariobeschreibung: string;
  risikofaktoren: string | null;
  wechselwirkungenBeruecksichtigt: boolean;
  ergebnis: string | null;
  rtfBeruecksichtigt: boolean;
  handlungsbedarf: string | null;
  durchgefuehrtAm: string;
  angemessenheitGeprueftAm: string | null;
  verantwortlichUserId: string | null;
};

export async function listRmStresstests() {
  return apiFetch<RmStresstest[]>("/risikomanagement/stresstests");
}

// AT 4.3.4 Modellregister types intentionally omitted here — two other open PRs (#10, #13)
// build that model independently; see the matching note in prisma/schema.prisma.
