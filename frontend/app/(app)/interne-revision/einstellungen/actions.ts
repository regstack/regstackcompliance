"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";

export type SeveritySettingsInput = Partial<Record<"besonders_schwerwiegend" | "schwerwiegend" | "wesentlich" | "geringfuegig", { label?: string; desc?: string }>>;

export type EinstellungenInput = {
  severity_settings: SeveritySettingsInput;
  angemessene_zeit_tage: number;
  qs_intervall_monate: number;
  risiko_review_intervall_monate: number;
};

/** Einstellungen-Seite schreibt nur die institutseigenen Kriterien und Fristen (Tz. 6, 7, 12) — die
 * Organisationsform (Tz. 1-2) lebt in derselben Tabelle, wird aber ausschließlich von der
 * Governance-Seite über `updateOrgForm` geschrieben (ein eigener Backend-Endpoint), damit keine
 * der beiden Seiten die Felder der jeweils anderen überschreibt. */
export async function updateEinstellungen(fields: EinstellungenInput) {
  await apiFetch("/revisions/governance/einstellungen", {
    method: "PUT",
    body: JSON.stringify({
      severitySettings: fields.severity_settings,
      angemesseneZeitTage: fields.angemessene_zeit_tage,
      qsIntervallMonate: fields.qs_intervall_monate,
      risikoReviewIntervallMonate: fields.risiko_review_intervall_monate,
    }),
  });
  revalidatePath("/interne-revision/einstellungen");
  revalidatePath("/interne-revision");
}
