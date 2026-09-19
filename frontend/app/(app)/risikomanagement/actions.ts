"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { RisikoartKategorie, RmStrategieArt, RtfAnsatz } from "@/lib/regstack/risikomanagement";

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
