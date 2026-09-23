import { apiFetch } from "@/lib/regstack/backend-client";
import type { ItAssetKategorie, ItEntwicklungsart } from "@/lib/regstack/it-risiko-labels";

// Client Components must import IT_ASSET_KATEGORIE_LABELS/ItAssetKategorie from
// "@/lib/regstack/it-risiko-labels" directly instead of from this module, since importing any
// value from here pulls the server-only backend client into the browser bundle.
export * from "@/lib/regstack/it-risiko-labels";

export type ItStrategieStatus = "entwurf" | "verabschiedet";

export type ItStrategie = {
  id: string;
  jahr: number;
  inhalt: Record<string, unknown>;
  status: ItStrategieStatus;
  verabschiedetAm: string | null;
  verabschiedetVonUserId: string | null;
  konsistenzpruefungGeschaeftsstrategie: string | null;
  naechsteUeberpruefung: string | null;
};

export type ItSchutzbedarf = "normal" | "hoch" | "sehr_hoch";

export type ItAsset = {
  id: string;
  bezeichnung: string;
  kategorie: ItAssetKategorie;
  eigentuemerUserId: string | null;
  schutzbedarfVertraulichkeit: ItSchutzbedarf | null;
  schutzbedarfIntegritaet: ItSchutzbedarf | null;
  schutzbedarfVerfuegbarkeit: ItSchutzbedarf | null;
  begruendung: string | null;
  letzteUeberpruefung: string | null;
  naechsteUeberpruefung: string | null;
  // Kap. 7.13/7.14 — IDV-Register-Zusatzfelder, direkt an ItAsset statt einem zweiten Register.
  istIdv: boolean;
  zweck: string | null;
  version: string | null;
  fremdOderEigenentwicklung: ItEntwicklungsart | null;
  technischVerantwortlichUserId: string | null;
  technologie: string | null;
};

export type ItRisikoStatus = "offen" | "in_bearbeitung" | "akzeptiert_von_gl" | "geschlossen";

export type ItRisiko = {
  id: string;
  assetId: string | null;
  asset: { id: string; bezeichnung: string } | null;
  bedrohung: string;
  eintrittswahrscheinlichkeit: string | null;
  auswirkung: string | null;
  bruttorisiko: string | null;
  massnahme: string | null;
  restrisiko: string | null;
  status: ItRisikoStatus;
  verantwortlichUserId: string | null;
  akzeptiertVonUserId: string | null;
  akzeptiertAm: string | null;
};

export type ItVorfallSchweregrad = "gering" | "mittel" | "hoch" | "kritisch";
export type ItVorfallStatus = "offen" | "in_bearbeitung" | "geschlossen";

export type ItSicherheitsvorfall = {
  id: string;
  datum: string;
  kategorie: string | null;
  schweregrad: ItVorfallSchweregrad;
  beschreibung: string;
  betroffeneSysteme: string | null;
  eskalationAnUserId: string | null;
  meldepflichtBaFin: boolean;
  meldedatumBaFin: string | null;
  status: ItVorfallStatus;
  massnahme: string | null;
  abschlussAm: string | null;
  abschlussVonUserId: string | null;
};

export async function listItStrategien() {
  return apiFetch<ItStrategie[]>("/it-risiko/strategie");
}

export async function listItAssets() {
  return apiFetch<ItAsset[]>("/it-risiko/assets");
}

export async function listItRisiken() {
  return apiFetch<ItRisiko[]>("/it-risiko/risiken");
}

export async function listItSicherheitsvorfaelle() {
  return apiFetch<ItSicherheitsvorfall[]>("/it-risiko/vorfaelle");
}

// --- Kap. 6 Identitäts- und Rechtemanagement ------------------------------------------------

export type ItBerechtigungStatus = "aktiv" | "deaktiviert" | "entzogen";

export type ItBerechtigung = {
  id: string;
  assetId: string | null;
  asset: { id: string; bezeichnung: string } | null;
  benutzerBezeichnung: string;
  benutzerUserId: string | null;
  istTechnischerBenutzer: boolean;
  istPrivilegiert: boolean;
  berechtigungsart: string;
  needToKnowBegruendung: string | null;
  befristetBis: string | null;
  status: ItBerechtigungStatus;
  genehmigtVonUserId: string | null;
  deaktiviertAm: string | null;
  deaktiviertVonUserId: string | null;
  letzteRezertifizierung: string | null;
  naechsteRezertifizierung: string | null;
  rezertifiziertVonUserId: string | null;
};

export async function listItBerechtigungen() {
  return apiFetch<ItBerechtigung[]>("/it-risiko/berechtigungen");
}

// --- Kap. 7 IT-Projekte und Anwendungsentwicklung -------------------------------------------

export type ItProjektStatus = "geplant" | "laufend" | "abgeschlossen" | "abgebrochen";

export type ItProjekt = {
  id: string;
  bezeichnung: string;
  ziel: string | null;
  vorgehensmodell: string | null;
  risikobewertung: string | null;
  ressourcenausstattung: string | null;
  verantwortlichUserId: string | null;
  status: ItProjektStatus;
  startAm: string | null;
  geplantesEndeAm: string | null;
  tatsaechlichesEndeAm: string | null;
  lessonsLearned: string | null;
};

export async function listItProjekte() {
  return apiFetch<ItProjekt[]>("/it-risiko/projekte");
}

// --- Kap. 8 IT-Betrieb: Änderungsmanagement + Betriebsstörungen -----------------------------

export type ItAenderungStatus = "beantragt" | "genehmigt" | "umgesetzt" | "zurueckgestellt";

export type ItAenderung = {
  id: string;
  assetId: string | null;
  asset: { id: string; bezeichnung: string } | null;
  bezeichnung: string;
  art: string | null;
  risikobewertung: string | null;
  testErgebnis: string | null;
  rueckabwicklungsplan: string | null;
  status: ItAenderungStatus;
  geplantAm: string | null;
  genehmigtVonUserId: string | null;
  genehmigtAm: string | null;
  umgesetztAm: string | null;
};

export async function listItAenderungen() {
  return apiFetch<ItAenderung[]>("/it-risiko/aenderungen");
}

export type ItStoerungPrioritaet = "niedrig" | "mittel" | "hoch" | "kritisch";
export type ItStoerungStatus = "offen" | "in_bearbeitung" | "geschlossen";

export type ItBetriebsstoerung = {
  id: string;
  datum: string;
  beschreibung: string;
  betroffeneSysteme: string | null;
  ursache: string | null;
  prioritaet: ItStoerungPrioritaet;
  status: ItStoerungStatus;
  massnahme: string | null;
  eskalationAnUserId: string | null;
  geschaeftsleitungInformiert: boolean;
  abschlussAm: string | null;
  abschlussVonUserId: string | null;
};

export async function listItBetriebsstoerungen() {
  return apiFetch<ItBetriebsstoerung[]>("/it-risiko/betriebsstoerungen");
}

// --- Kap. 10 IT-Notfallmanagement ------------------------------------------------------------

export type ItNotfallplanStatus = "entwurf" | "freigegeben";

export type ItNotfallplan = {
  id: string;
  assetId: string | null;
  asset: { id: string; bezeichnung: string } | null;
  bezeichnung: string;
  rto: string | null;
  rpo: string | null;
  konfigurationNotbetrieb: string | null;
  abhaengigkeiten: string | null;
  status: ItNotfallplanStatus;
  freigegebenVonUserId: string | null;
  freigegebenAm: string | null;
  letzterTestAm: string | null;
};

export type ItNotfalltest = {
  id: string;
  notfallplanId: string;
  datum: string;
  umfang: string | null;
  ergebnis: string | null;
  abgeleiteteMassnahmen: string | null;
  durchgefuehrtVonUserId: string | null;
};

export async function listItNotfallplaene() {
  return apiFetch<ItNotfallplan[]>("/it-risiko/notfallmanagement/plaene");
}

export async function listItNotfalltests(planId: string) {
  return apiFetch<ItNotfalltest[]>(`/it-risiko/notfallmanagement/plaene/${planId}/tests`);
}
