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
