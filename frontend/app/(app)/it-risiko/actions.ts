"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { ItAssetKategorie, ItSchutzbedarf } from "@/lib/regstack/it-risiko";

export async function addItStrategie(jahr: number, konsistenzpruefungGeschaeftsstrategie: string) {
  await apiFetch("/it-risiko/strategie", {
    method: "POST",
    body: JSON.stringify({ jahr, konsistenzpruefungGeschaeftsstrategie: konsistenzpruefungGeschaeftsstrategie || undefined }),
  });
  revalidatePath("/it-risiko");
}

// Geschäftsleitung/Admin-only ("itStrategy.approve").
export async function verabschiedeItStrategie(id: string) {
  await apiFetch(`/it-risiko/strategie/${id}/verabschieden`, { method: "POST" });
  revalidatePath("/it-risiko");
}

export type ItAssetInput = {
  bezeichnung: string;
  kategorie: ItAssetKategorie;
  schutzbedarfVertraulichkeit: ItSchutzbedarf | "";
  schutzbedarfIntegritaet: ItSchutzbedarf | "";
  schutzbedarfVerfuegbarkeit: ItSchutzbedarf | "";
  begruendung: string;
};

export async function addItAsset(fields: ItAssetInput) {
  await apiFetch("/it-risiko/assets", {
    method: "POST",
    body: JSON.stringify({
      bezeichnung: fields.bezeichnung,
      kategorie: fields.kategorie,
      schutzbedarfVertraulichkeit: fields.schutzbedarfVertraulichkeit || undefined,
      schutzbedarfIntegritaet: fields.schutzbedarfIntegritaet || undefined,
      schutzbedarfVerfuegbarkeit: fields.schutzbedarfVerfuegbarkeit || undefined,
      begruendung: fields.begruendung || undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

export type ItRisikoInput = {
  assetId: string;
  bedrohung: string;
  eintrittswahrscheinlichkeit: string;
  auswirkung: string;
  restrisiko: string;
  massnahme: string;
};

export async function addItRisiko(fields: ItRisikoInput) {
  await apiFetch("/it-risiko/risiken", {
    method: "POST",
    body: JSON.stringify({
      assetId: fields.assetId || undefined,
      bedrohung: fields.bedrohung,
      eintrittswahrscheinlichkeit: fields.eintrittswahrscheinlichkeit || undefined,
      auswirkung: fields.auswirkung || undefined,
      restrisiko: fields.restrisiko || undefined,
      massnahme: fields.massnahme || undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

// Geschäftsleitung/Admin-only ("itRisk.accept") — akzeptiert ein verbleibendes Restrisiko.
export async function acceptItRisiko(id: string) {
  await apiFetch(`/it-risiko/risiken/${id}/accept`, { method: "POST" });
  revalidatePath("/it-risiko");
}

export type ItVorfallInput = {
  datum: string;
  schweregrad: "gering" | "mittel" | "hoch" | "kritisch";
  beschreibung: string;
  betroffeneSysteme: string;
  meldepflichtBaFin: boolean;
};

export async function addItVorfall(fields: ItVorfallInput) {
  await apiFetch("/it-risiko/vorfaelle", {
    method: "POST",
    body: JSON.stringify({
      datum: new Date(fields.datum).toISOString(),
      schweregrad: fields.schweregrad,
      beschreibung: fields.beschreibung,
      betroffeneSysteme: fields.betroffeneSysteme || undefined,
      meldepflichtBaFin: fields.meldepflichtBaFin,
    }),
  });
  revalidatePath("/it-risiko");
}

export async function abschliessenItVorfall(id: string) {
  await apiFetch(`/it-risiko/vorfaelle/${id}/abschliessen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// --- Kap. 6 Identitäts- und Rechtemanagement ------------------------------------------------

export type ItBerechtigungInput = {
  assetId: string;
  benutzerBezeichnung: string;
  istTechnischerBenutzer: boolean;
  istPrivilegiert: boolean;
  berechtigungsart: string;
  needToKnowBegruendung: string;
};

export async function addItBerechtigung(fields: ItBerechtigungInput) {
  await apiFetch("/it-risiko/berechtigungen", {
    method: "POST",
    body: JSON.stringify({
      assetId: fields.assetId || undefined,
      benutzerBezeichnung: fields.benutzerBezeichnung,
      istTechnischerBenutzer: fields.istTechnischerBenutzer,
      istPrivilegiert: fields.istPrivilegiert,
      berechtigungsart: fields.berechtigungsart,
      needToKnowBegruendung: fields.needToKnowBegruendung || undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

// Tz. 6.5 — die zuständige Kontrollinstanz bestätigt, dass die Berechtigung weiterhin benötigt wird.
export async function rezertifizierenItBerechtigung(id: string) {
  await apiFetch(`/it-risiko/berechtigungen/${id}/rezertifizieren`, { method: "POST" });
  revalidatePath("/it-risiko");
}

export async function deaktivierenItBerechtigung(id: string) {
  await apiFetch(`/it-risiko/berechtigungen/${id}/deaktivieren`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// Tz. 6.4 — unverzüglicher Entzug, z. B. bei Wegfall der Erforderlichkeit. Endzustand.
export async function entziehenItBerechtigung(id: string) {
  await apiFetch(`/it-risiko/berechtigungen/${id}/entziehen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// --- Kap. 7 IT-Projekte und Anwendungsentwicklung -------------------------------------------

export type ItProjektInput = {
  bezeichnung: string;
  ziel: string;
  vorgehensmodell: string;
  risikobewertung: string;
  startAm: string;
  geplantesEndeAm: string;
};

export async function addItProjekt(fields: ItProjektInput) {
  await apiFetch("/it-risiko/projekte", {
    method: "POST",
    body: JSON.stringify({
      bezeichnung: fields.bezeichnung,
      ziel: fields.ziel || undefined,
      vorgehensmodell: fields.vorgehensmodell || undefined,
      risikobewertung: fields.risikobewertung || undefined,
      startAm: fields.startAm ? new Date(fields.startAm).toISOString() : undefined,
      geplantesEndeAm: fields.geplantesEndeAm ? new Date(fields.geplantesEndeAm).toISOString() : undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

// Tz. 7.2 — Lessons Learned sind Pflichtbestandteil des Projektabschlusses.
export async function abschliessenItProjekt(id: string, lessonsLearned: string) {
  await apiFetch(`/it-risiko/projekte/${id}/abschliessen`, {
    method: "POST",
    body: JSON.stringify({ lessonsLearned }),
  });
  revalidatePath("/it-risiko");
}

export async function abbrechenItProjekt(id: string) {
  await apiFetch(`/it-risiko/projekte/${id}/abbrechen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// --- Kap. 8 IT-Betrieb: Änderungsmanagement -------------------------------------------------

export type ItAenderungInput = {
  assetId: string;
  bezeichnung: string;
  art: string;
  risikobewertung: string;
  rueckabwicklungsplan: string;
  geplantAm: string;
};

export async function addItAenderung(fields: ItAenderungInput) {
  await apiFetch("/it-risiko/aenderungen", {
    method: "POST",
    body: JSON.stringify({
      assetId: fields.assetId || undefined,
      bezeichnung: fields.bezeichnung,
      art: fields.art || undefined,
      risikobewertung: fields.risikobewertung || undefined,
      rueckabwicklungsplan: fields.rueckabwicklungsplan || undefined,
      geplantAm: fields.geplantAm ? new Date(fields.geplantAm).toISOString() : undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

// Tz. 8.5 — Genehmigung vor Produktivsetzung.
export async function genehmigenItAenderung(id: string) {
  await apiFetch(`/it-risiko/aenderungen/${id}/genehmigen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

export async function umsetzenItAenderung(id: string) {
  await apiFetch(`/it-risiko/aenderungen/${id}/umsetzen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

export async function zurueckstellenItAenderung(id: string) {
  await apiFetch(`/it-risiko/aenderungen/${id}/zurueckstellen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// --- Kap. 8 IT-Betrieb: Betriebsstörungen ---------------------------------------------------

export type ItBetriebsstoerungInput = {
  datum: string;
  beschreibung: string;
  betroffeneSysteme: string;
  ursache: string;
  prioritaet: "niedrig" | "mittel" | "hoch" | "kritisch";
  geschaeftsleitungInformiert: boolean;
};

export async function addItBetriebsstoerung(fields: ItBetriebsstoerungInput) {
  await apiFetch("/it-risiko/betriebsstoerungen", {
    method: "POST",
    body: JSON.stringify({
      datum: new Date(fields.datum).toISOString(),
      beschreibung: fields.beschreibung,
      betroffeneSysteme: fields.betroffeneSysteme || undefined,
      ursache: fields.ursache || undefined,
      prioritaet: fields.prioritaet,
      geschaeftsleitungInformiert: fields.geschaeftsleitungInformiert,
    }),
  });
  revalidatePath("/it-risiko");
}

export async function abschliessenItBetriebsstoerung(id: string) {
  await apiFetch(`/it-risiko/betriebsstoerungen/${id}/abschliessen`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// --- Kap. 10 IT-Notfallmanagement ------------------------------------------------------------

export type ItNotfallplanInput = {
  assetId: string;
  bezeichnung: string;
  rto: string;
  rpo: string;
  konfigurationNotbetrieb: string;
};

export async function addItNotfallplan(fields: ItNotfallplanInput) {
  await apiFetch("/it-risiko/notfallmanagement/plaene", {
    method: "POST",
    body: JSON.stringify({
      assetId: fields.assetId || undefined,
      bezeichnung: fields.bezeichnung,
      rto: fields.rto || undefined,
      rpo: fields.rpo || undefined,
      konfigurationNotbetrieb: fields.konfigurationNotbetrieb || undefined,
    }),
  });
  revalidatePath("/it-risiko");
}

export async function freigebenItNotfallplan(id: string) {
  await apiFetch(`/it-risiko/notfallmanagement/plaene/${id}/freigeben`, { method: "POST" });
  revalidatePath("/it-risiko");
}

// Tz. 10.4 — mindestens jährlicher Wirksamkeitstest je Notfallplan.
export async function addItNotfalltest(planId: string, ergebnis: string, datum: string) {
  await apiFetch(`/it-risiko/notfallmanagement/plaene/${planId}/tests`, {
    method: "POST",
    body: JSON.stringify({ datum: new Date(datum).toISOString(), ergebnis: ergebnis || undefined }),
  });
  revalidatePath("/it-risiko");
}
