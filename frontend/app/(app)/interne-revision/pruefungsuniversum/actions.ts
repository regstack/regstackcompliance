"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { Risikokriterien } from "@/lib/regstack/revisions-utils";

const LIST_PATH = "/interne-revision/pruefungsuniversum";
const detailPath = (id: string) => `/interne-revision/pruefungsuniversum/${id}`;

/* =====================================================================
 * Prüfungsobjekte (M1)
 * ===================================================================*/

export type UniversumBasicInput = {
  bezeichnung: string;
  bereich: string | null;
  category: string | null;
  outsourced: boolean;
  materiality: string;
  reg_anker: string | null;
  verantwortlicher_person_id: string | null;
  plan_year: number | null;
};

function universumBody(fields: UniversumBasicInput) {
  return {
    bezeichnung: fields.bezeichnung,
    bereich: fields.bereich ?? undefined,
    category: fields.category,
    outsourced: fields.outsourced,
    materiality: fields.materiality || undefined,
    regAnker: fields.reg_anker ?? undefined,
    verantwortlichUserId: fields.verantwortlicher_person_id,
    planYear: fields.plan_year,
  };
}

export async function addUniversumItem(fields: UniversumBasicInput): Promise<string> {
  const created = await apiFetch<{ id: string }>("/revisions/universum", { method: "POST", body: JSON.stringify(universumBody(fields)) });
  revalidatePath(LIST_PATH);
  return created.id;
}

export async function updateUniversumBasic(id: string, fields: UniversumBasicInput) {
  await apiFetch(`/revisions/universum/${id}`, { method: "PATCH", body: JSON.stringify(universumBody(fields)) });
  revalidatePath(detailPath(id));
  revalidatePath(LIST_PATH);
}

/** Inline-Änderung aus der Universumsliste heraus (Wesentlichkeit-Select je Zeile). */
export async function setUniversumMateriality(id: string, materiality: string) {
  await apiFetch(`/revisions/universum/${id}`, { method: "PATCH", body: JSON.stringify({ materiality: materiality || undefined }) });
  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(id));
}

/** Lebenszyklus-Status des Prüfungsobjekts selbst (aktiv im Universum geführt / archiviert) —
 * unabhängig vom abgeleiteten Prüfstatus (never/overdue/due_soon/on_time), der aus last_audit_date
 * berechnet wird und nicht gespeichert ist. */
export async function setUniversumStatus(id: string, status: string) {
  await apiFetch(`/revisions/universum/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  revalidatePath(detailPath(id));
  revalidatePath(LIST_PATH);
}

export async function updateUniversumRisk(id: string, risikokriterien: Risikokriterien, riskRationale: Partial<Record<keyof Risikokriterien, string>>) {
  await apiFetch(`/revisions/universum/${id}`, { method: "PATCH", body: JSON.stringify({ risikokriterien, riskRationale }) });
  revalidatePath(detailPath(id));
  revalidatePath(LIST_PATH);
}

/** Tz. 6 S.3 — die Risikobewertung ist regelmäßig zu überprüfen; Datum und Prüfer der letzten
 * Überprüfung werden getrennt von der Bewertung selbst festgehalten. */
export async function updateUniversumRiskReview(id: string, riskReviewDate: string | null, riskReviewReviewerPersonId: string | null) {
  await apiFetch(`/revisions/universum/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      riskReviewDate: riskReviewDate ? new Date(riskReviewDate).toISOString() : null,
      riskReviewReviewerUserId: riskReviewReviewerPersonId,
    }),
  });
  revalidatePath(detailPath(id));
}

/* =====================================================================
 * Jahresplan (Tz. 6 S.4-7) — Genehmigung, Kapazitätsplanung, wesentliche Anpassungen
 * ===================================================================*/

export type PlanAdjustment = { date: string; desc: string; approvedBy: string };
export type PlanContent = { kapazitaetPT: number; adjustments: PlanAdjustment[] };

export async function createAuditPlan(year: number): Promise<string> {
  const content: PlanContent = { kapazitaetPT: 0, adjustments: [] };
  const created = await apiFetch<{ id: string }>("/revisions/universum/plans", { method: "POST", body: JSON.stringify({ year, content }) });
  revalidatePath(LIST_PATH);
  return created.id;
}

export async function updateAuditPlanContent(id: string, content: PlanContent) {
  await apiFetch(`/revisions/universum/plans/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  revalidatePath(LIST_PATH);
}

export async function addPlanAdjustment(id: string, current: PlanContent, entry: PlanAdjustment) {
  const content: PlanContent = { ...current, adjustments: [...current.adjustments, entry] };
  await apiFetch(`/revisions/universum/plans/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
  revalidatePath(LIST_PATH);
}

export async function submitAuditPlan(id: string) {
  await apiFetch(`/revisions/universum/plans/${id}/submit`, { method: "PATCH" });
  revalidatePath(LIST_PATH);
}

/** Geschäftsleitung/Admin only — enforced server-side (RBAC revisionPlan.approve), not just a UI
 * check. Also called from the Dashboard's own audit-plan-approve action (one implementation). */
export async function approveAuditPlan(id: string) {
  await apiFetch(`/revisions/universum/plans/${id}/approve`, { method: "PATCH" });
  revalidatePath(LIST_PATH);
  revalidatePath("/dashboard");
}
