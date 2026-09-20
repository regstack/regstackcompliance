"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { RisikoartKategorie, RmStrategieArt, RtfAnsatz, ModellStatus } from "@/lib/regstack/risikomanagement";

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

export async function addRmReport(reportType: string, periodFrom: string, periodTo: string) {
  await apiFetch("/risikomanagement/reports", {
    method: "POST",
    body: JSON.stringify({
      reportType,
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

export type AufsichtsorganBerichtInput = {
  periodFrom: string;
  periodTo: string;
  geschaeftslage: string;
  risikosituation: string;
  strategien: string;
  complianceBericht: string;
  revisionsberichte: string;
};

// AT 3.2, Geschäftsleitung/Admin-only ("supervisoryBoardReport") — serverseitig erzwungen.
export async function addAufsichtsorganBericht(fields: AufsichtsorganBerichtInput) {
  await apiFetch("/risikomanagement/aufsichtsorganberichte", {
    method: "POST",
    body: JSON.stringify({
      periodFrom: fields.periodFrom ? new Date(fields.periodFrom).toISOString() : undefined,
      periodTo: fields.periodTo ? new Date(fields.periodTo).toISOString() : undefined,
      content: {
        geschaeftslage: fields.geschaeftslage || undefined,
        risikosituation: fields.risikosituation || undefined,
        strategien: fields.strategien || undefined,
        complianceBericht: fields.complianceBericht || undefined,
        revisionsberichte: fields.revisionsberichte || undefined,
      },
    }),
  });
  revalidatePath("/risikomanagement");
}

export async function finalizeAufsichtsorganBericht(id: string) {
  await apiFetch(`/risikomanagement/aufsichtsorganberichte/${id}/finalize`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

// Dokumentiert die tatsächliche Übermittlung an das Aufsichtsorgan — der eigentliche Nachweis für
// AT 3.2, da es keinen Kenntnisnahme-Flow wie bei RmReport geben kann (kein Login).
export async function markAufsichtsorganBerichtSent(id: string) {
  await apiFetch(`/risikomanagement/aufsichtsorganberichte/${id}/mark-sent`, { method: "POST" });
  revalidatePath("/risikomanagement");
}

export type ModellregisterInput = {
  bezeichnung: string;
  zweck: string;
  istKiBasiert: boolean;
  erklaerbarkeitBewertung: string;
  ueberschreibungenBeschreibung: string;
  naechsteValidierung: string;
};

export async function addModellregisterEintrag(fields: ModellregisterInput) {
  await apiFetch("/risikomanagement/modellregister", {
    method: "POST",
    body: JSON.stringify({
      bezeichnung: fields.bezeichnung,
      zweck: fields.zweck,
      istKiBasiert: fields.istKiBasiert,
      erklaerbarkeitBewertung: fields.erklaerbarkeitBewertung || undefined,
      ueberschreibungenBeschreibung: fields.ueberschreibungenBeschreibung || undefined,
      naechsteValidierung: fields.naechsteValidierung ? new Date(fields.naechsteValidierung).toISOString() : undefined,
    }),
  });
  revalidatePath("/risikomanagement");
}

// Deckt sowohl den Statuswechsel (z. B. nach einer abgeschlossenen Validierung) als auch das
// Nachtragen des Validierungsergebnisses ab — ein PUT auf denselben Eintrag wie bei Risikoinventur.
export async function setModellStatus(id: string, status: ModellStatus, validierungsergebnis?: string) {
  await apiFetch(`/risikomanagement/modellregister/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      ...(status === "aktiv" ? { letzteValidierung: new Date().toISOString() } : {}),
      ...(validierungsergebnis ? { validierungsergebnis } : {}),
    }),
  });
  revalidatePath("/risikomanagement");
}
