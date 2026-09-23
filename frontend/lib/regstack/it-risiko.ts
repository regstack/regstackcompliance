import { apiFetch } from "@/lib/regstack/backend-client";
import type { ItAssetKategorie } from "@/lib/regstack/it-risiko-labels";

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

// --- Kap. 8 IT-Betrieb: Betriebsstörungen ----------------------------------------------------
// Berechtigungsmanagement (Kap. 6), IT-Projekte (Kap. 7) und Änderungsmanagement (Kap. 8, Tz.
// 8.4-8.5) sind bewusst nicht hier — siehe Risikomanagement_BAIT_MVP_Spezifikation.md,
// "Koordination mit parallelen Sessions": PR #13 deckt diese Bausteine bereits ab.

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
