"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { OutsourcingReport } from "@/lib/regstack/outsourcing-reports";

export type CreateReportInput = {
  period: string;
  conclusionContract: string;
  conclusionSteuerbarkeit: string;
  conclusionMassnahmen: string;
  includedActivityIds: string[];
};

export async function createOutsourcingReport(fields: CreateReportInput) {
  await apiFetch<OutsourcingReport>("/reports", { method: "POST", body: JSON.stringify(fields) });
  revalidatePath("/outsourcing/bericht");
}

// Geschäftsleitung-Kenntnisnahme (Genehmigung) — Backend erlaubt genau einen Genehmiger, der
// zweite Aufruf schlägt serverseitig mit "Bericht bereits genehmigt" fehl.
export async function approveOutsourcingReport(id: string) {
  await apiFetch<OutsourcingReport>(`/reports/${id}/approve`, { method: "POST" });
  revalidatePath("/outsourcing/bericht");
}
