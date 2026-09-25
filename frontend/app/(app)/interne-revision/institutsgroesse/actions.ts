"use server";

import { revalidatePath } from "next/cache";
import { updateInstitutionSettings, type SizeClass } from "@/lib/regstack/institution";

const REVALIDATE_PATHS = ["/interne-revision/institutsgroesse", "/interne-revision/governance", "/outsourcing"];

// Sends only sizeClass — reviewCycleYears is deliberately omitted so the server derives it
// (SEHR_KLEIN/KLEIN → 3, MITTEL → 2, GROSS → 1) instead of racing a stale client-computed value.
export async function updateSizeClass(sizeClass: SizeClass) {
  await updateInstitutionSettings({ sizeClass });
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function updateReviewCycleYears(reviewCycleYears: number) {
  await updateInstitutionSettings({ reviewCycleYears });
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function updateRevisionsbeauftragter(input: {
  revisionsbeauftragterName?: string | null;
  revisionsbeauftragterIstGeschaeftsleiter?: boolean;
}) {
  await updateInstitutionSettings(input);
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}
