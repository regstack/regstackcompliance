"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { RisikoartKategorie, RmModellErklaerbarkeit, RmModellValidierungErgebnis, RmReportEmpfaenger, RmStrategieArt, RtfAnsatz } from "@/lib/regstack/risikomanagement";
import type { RmStresstestTyp, RmStresstestEbene } from "@/lib/regstack/risikomanagement-labels";

export type RisikoinventurInput = {
  jahr: number;
  kategorie: RisikoartKategorie;
  bezeichnung: string;
  wesentlichkeit: "wesentlich" | "nicht_wesentlich";
  begruendung: string;
  naechsteUeberpruefung: string;
};

export async function addRisikoinventurEintrag(fields: RisikoinventurInput) {
  await apiFetch("/risikomanagement/inventur", {
    method: "POST",
    body: JSON.stringify({
      jahr: fields.jahr,
      kategorie: fields.kategorie,
      bezeichnung: fields.bezeichnung,
      wesentlichkeit: fields.wesentlichkeit,
      begruendung: fields.begruendung || undefined,
      naechsteUeberpruefung: fields.naechsteUeberpruefung ? new Date(fields.naechsteUeberpruefung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function updateRisikoinventurEintrag(id: string, fields: RisikoinventurInput) {
  await apiFetch(`/risikomanagement/inventur/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      jahr: fields.jahr,
      kategorie: fields.kategorie,
      bezeichnung: fields.bezeichnung,
      wesentlichkeit: fields.wesentlichkeit,
      begruendung: fields.begruendung || undefined,
      naechsteUeberpruefung: fields.naechsteUeberpruefung ? new Date(fields.naechsteUeberpruefung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export type RisikostrategieInput = {
  art: RmStrategieArt;
  jahr: number;
  naechsteUeberpruefung: string;
};

export async function addRisikostrategie(fields: RisikostrategieInput) {
  await apiFetch("/risikomanagement/strategien", {
    method: "POST",
    body: JSON.stringify({
      art: fields.art,
      jahr: fields.jahr,
      naechsteUeberpruefung: fields.naechsteUeberpruefung ? new Date(fields.naechsteUeberpruefung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Geschäftsleitung/Admin-only, serverseitig über "riskStrategy.approve" erzwungen (rbac.ts) — der
// Aufruf schlägt für jede andere Rolle mit einem 403 fehl, unabhängig davon, ob der Button hier
// sichtbar ist.
export async function verabschiedeRisikostrategie(id: string) {
  await apiFetch(`/risikomanagement/strategien/${id}/verabschieden`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

// Nur solange status=entwurf möglich — nach Verabschiedung lehnt die Route selbst ab (422). Das
// `inhalt`-JSON hat noch keinen eigenen Editor und bleibt hier bewusst ausgeklammert.
export async function updateRisikostrategie(id: string, naechsteUeberpruefung: string) {
  await apiFetch(`/risikomanagement/strategien/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      naechsteUeberpruefung: naechsteUeberpruefung ? new Date(naechsteUeberpruefung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export type RtfSnapshotInput = {
  periode: string;
  ansatz: RtfAnsatz;
  risikodeckungspotenzial: number | null;
  auslastungGesamt: number | null;
  ergebnis: string;
};

export async function addRtfSnapshot(fields: RtfSnapshotInput) {
  await apiFetch("/risikomanagement/risikotragfaehigkeit", {
    method: "POST",
    body: JSON.stringify({
      periode: fields.periode,
      ansatz: fields.ansatz,
      risikodeckungspotenzial: fields.risikodeckungspotenzial,
      auslastungGesamt: fields.auslastungGesamt,
      ergebnis: fields.ergebnis || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function freigebenRtfSnapshot(id: string) {
  await apiFetch(`/risikomanagement/risikotragfaehigkeit/${id}/freigeben`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

export async function addRmReport(reportType: string, empfaenger: RmReportEmpfaenger, periodFrom: string, periodTo: string) {
  await apiFetch("/risikomanagement/reports", {
    method: "POST",
    body: JSON.stringify({
      reportType,
      empfaenger,
      periodFrom: periodFrom ? new Date(periodFrom).toISOString() : undefined,
      periodTo: periodTo ? new Date(periodTo).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Nur solange status=entwurf möglich — die Route lehnt einen finalen Bericht selbst ab (422).
export async function updateRmReport(id: string, reportType: string, empfaenger: RmReportEmpfaenger, periodFrom: string, periodTo: string) {
  await apiFetch(`/risikomanagement/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      reportType,
      empfaenger,
      periodFrom: periodFrom ? new Date(periodFrom).toISOString() : undefined,
      periodTo: periodTo ? new Date(periodTo).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function finalizeRmReport(id: string) {
  await apiFetch(`/risikomanagement/reports/${id}/finalize`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

// Geschäftsleitung/Admin-only ("riskManagementReport.acknowledge") — ein Zeilen-Datensatz pro
// Kenntnisnahme statt eines einzelnen Felds, siehe rm_report_acknowledgements.
export async function acknowledgeRmReport(id: string) {
  await apiFetch(`/risikomanagement/reports/${id}/acknowledge`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

export type RmKapitalplanungInput = {
  jahr: number;
  planungshorizontJahre: number;
  adverseSzenarienBeruecksichtigt: boolean;
  konsistenzGeschaeftsplanung: string;
};

export async function addRmKapitalplanung(fields: RmKapitalplanungInput) {
  await apiFetch("/risikomanagement/kapitalplanung", {
    method: "POST",
    body: JSON.stringify({
      jahr: fields.jahr,
      planungshorizontJahre: fields.planungshorizontJahre,
      adverseSzenarienBeruecksichtigt: fields.adverseSzenarienBeruecksichtigt,
      konsistenzGeschaeftsplanung: fields.konsistenzGeschaeftsplanung || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Nur solange nicht verabschiedet möglich — die Route lehnt eine verabschiedete Kapitalplanung
// selbst ab (422), siehe kapitalplanung.routes.ts.
export async function updateRmKapitalplanung(id: string, fields: RmKapitalplanungInput) {
  await apiFetch(`/risikomanagement/kapitalplanung/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      jahr: fields.jahr,
      planungshorizontJahre: fields.planungshorizontJahre,
      adverseSzenarienBeruecksichtigt: fields.adverseSzenarienBeruecksichtigt,
      konsistenzGeschaeftsplanung: fields.konsistenzGeschaeftsplanung || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Geschäftsleitung/Admin-only ("riskCapitalPlanning.approve"), serverseitig erzwungen — analog
// verabschiedeRisikostrategie.
export async function verabschiedeRmKapitalplanung(id: string) {
  await apiFetch(`/risikomanagement/kapitalplanung/${id}/verabschieden`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

export type RmNplKennzahlInput = {
  periode: string;
  nplQuote: number | null;
  nplBestand: number | null;
  zielQuote: number | null;
  abbaupfadEingehalten: boolean | null;
  massnahmen: string;
};

export async function addRmNplKennzahl(fields: RmNplKennzahlInput) {
  await apiFetch("/risikomanagement/npl", {
    method: "POST",
    body: JSON.stringify({
      periode: fields.periode,
      nplQuote: fields.nplQuote,
      nplBestand: fields.nplBestand,
      zielQuote: fields.zielQuote,
      abbaupfadEingehalten: fields.abbaupfadEingehalten,
      massnahmen: fields.massnahmen || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function updateRmNplKennzahl(id: string, fields: RmNplKennzahlInput) {
  await apiFetch(`/risikomanagement/npl/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      periode: fields.periode,
      nplQuote: fields.nplQuote,
      nplBestand: fields.nplBestand,
      zielQuote: fields.zielQuote,
      abbaupfadEingehalten: fields.abbaupfadEingehalten,
      massnahmen: fields.massnahmen || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export type RmModellInput = {
  bezeichnung: string;
  zweck: string;
  enthaeltKiMlKomponente: boolean;
  erklaerbarkeit: RmModellErklaerbarkeit | "";
  ueberschreibungenVorhanden: boolean;
  ueberschreibungenBegruendung: string;
  naechsteValidierung: string;
};

export async function addRmModell(fields: RmModellInput) {
  await apiFetch("/risikomanagement/modelle", {
    method: "POST",
    body: JSON.stringify({
      bezeichnung: fields.bezeichnung,
      zweck: fields.zweck || undefined,
      enthaeltKiMlKomponente: fields.enthaeltKiMlKomponente,
      erklaerbarkeit: fields.erklaerbarkeit || undefined,
      ueberschreibungenVorhanden: fields.ueberschreibungenVorhanden,
      ueberschreibungenBegruendung: fields.ueberschreibungenVorhanden ? fields.ueberschreibungenBegruendung : undefined,
      naechsteValidierung: fields.naechsteValidierung ? new Date(fields.naechsteValidierung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Nicht mehr möglich sobald status=ausser_betrieb — die Route lehnt das selbst ab.
export async function updateRmModell(id: string, fields: RmModellInput) {
  await apiFetch(`/risikomanagement/modelle/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      bezeichnung: fields.bezeichnung,
      zweck: fields.zweck || undefined,
      enthaeltKiMlKomponente: fields.enthaeltKiMlKomponente,
      erklaerbarkeit: fields.erklaerbarkeit || undefined,
      ueberschreibungenVorhanden: fields.ueberschreibungenVorhanden,
      ueberschreibungenBegruendung: fields.ueberschreibungenVorhanden ? fields.ueberschreibungenBegruendung : undefined,
      naechsteValidierung: fields.naechsteValidierung ? new Date(fields.naechsteValidierung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export type RmModellValidierungInput = {
  durchgefuehrtAm: string;
  ergebnis: RmModellValidierungErgebnis;
  kommentar: string;
};

// ergebnis="ausser_betrieb_genommen" setzt das Modell serverseitig im selben Aufruf mit außer
// Betrieb — siehe modelle.routes.ts.
export async function validiereRmModell(id: string, fields: RmModellValidierungInput) {
  await apiFetch(`/risikomanagement/modelle/${id}/validieren`, {
    method: "POST",
    body: JSON.stringify({
      durchgefuehrtAm: new Date(fields.durchgefuehrtAm).toISOString(),
      ergebnis: fields.ergebnis,
      kommentar: fields.kommentar || undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export type RmStresstestInput = {
  jahr: number;
  typ: RmStresstestTyp;
  ebene: RmStresstestEbene;
  betroffeneRisikoarten: RisikoartKategorie[];
  szenariobeschreibung: string;
  risikofaktoren: string;
  wechselwirkungenBeruecksichtigt: boolean;
  ergebnis: string;
  rtfBeruecksichtigt: boolean;
  handlungsbedarf: string;
  durchgefuehrtAm: string;
};

export async function addRmStresstest(fields: RmStresstestInput) {
  await apiFetch("/risikomanagement/stresstests", {
    method: "POST",
    body: JSON.stringify({
      jahr: fields.jahr,
      typ: fields.typ,
      ebene: fields.ebene,
      betroffeneRisikoarten: fields.betroffeneRisikoarten,
      szenariobeschreibung: fields.szenariobeschreibung,
      risikofaktoren: fields.risikofaktoren || undefined,
      wechselwirkungenBeruecksichtigt: fields.wechselwirkungenBeruecksichtigt,
      ergebnis: fields.ergebnis || undefined,
      rtfBeruecksichtigt: fields.rtfBeruecksichtigt,
      handlungsbedarf: fields.handlungsbedarf || undefined,
      durchgefuehrtAm: fields.durchgefuehrtAm ? new Date(fields.durchgefuehrtAm).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function updateRmStresstest(id: string, fields: RmStresstestInput) {
  await apiFetch(`/risikomanagement/stresstests/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      jahr: fields.jahr,
      typ: fields.typ,
      ebene: fields.ebene,
      betroffeneRisikoarten: fields.betroffeneRisikoarten,
      szenariobeschreibung: fields.szenariobeschreibung,
      risikofaktoren: fields.risikofaktoren || undefined,
      wechselwirkungenBeruecksichtigt: fields.wechselwirkungenBeruecksichtigt,
      ergebnis: fields.ergebnis || undefined,
      rtfBeruecksichtigt: fields.rtfBeruecksichtigt,
      handlungsbedarf: fields.handlungsbedarf || undefined,
      durchgefuehrtAm: fields.durchgefuehrtAm ? new Date(fields.durchgefuehrtAm).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}
