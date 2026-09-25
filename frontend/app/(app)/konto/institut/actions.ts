"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { InstitutionSettings } from "@/lib/regstack/institution";

export type InstitutionSettingsPatch = Partial<
  Pick<
    InstitutionSettings,
    | "sizeClass"
    | "groupRelief"
    | "calculationModel"
    | "cscMaterialityThreshold"
    | "cscImpactThreshold"
    | "teslaLogicAnd"
    | "teslaThreshold"
    | "revisionsbeauftragterName"
    | "revisionsbeauftragterIstGeschaeftsleiter"
  >
>;

// requirePermission("institution", "write") on the backend (GESCHAEFTSLEITUNG/ADMIN only,
// institutions.routes.ts) is the real boundary and the write is audited there — this action is
// just the client-facing wrapper.
export async function updateInstitutionSettings(patch: InstitutionSettingsPatch): Promise<InstitutionSettings> {
  const updated = await apiFetch<InstitutionSettings>("/institutions/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  revalidatePath("/konto/institut");
  return updated;
}
