"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { BalanceSheetLineItem, IncomeStatementLineItem, NotesSection, ManagementReportSection } from "@/lib/regstack/accounting";

const REVALIDATE = "/buchhaltung";

type LineItemInput<T> = Omit<T, "id">;

export async function createBalanceSheet(fiscalYear: number, periodLabel?: string) {
  const created = await apiFetch<{ id: string }>("/accounting/balance-sheets", {
    method: "POST",
    body: JSON.stringify({ fiscalYear, periodLabel, lineItems: [] }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateBalanceSheetLineItems(id: string, lineItems: LineItemInput<BalanceSheetLineItem>[]) {
  await apiFetch(`/accounting/balance-sheets/${id}`, { method: "PATCH", body: JSON.stringify({ lineItems }) });
  revalidatePath(REVALIDATE);
}

export async function finalizeBalanceSheet(id: string) {
  await apiFetch(`/accounting/balance-sheets/${id}/finalize`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function reviseBalanceSheet(id: string) {
  const created = await apiFetch<{ id: string }>(`/accounting/balance-sheets/${id}/revise`, { method: "POST" });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function acknowledgeBalanceSheet(id: string) {
  await apiFetch(`/accounting/balance-sheets/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function createIncomeStatement(fiscalYear: number, periodLabel?: string) {
  const created = await apiFetch<{ id: string }>("/accounting/income-statements", {
    method: "POST",
    body: JSON.stringify({ fiscalYear, periodLabel, lineItems: [] }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateIncomeStatementLineItems(id: string, lineItems: LineItemInput<IncomeStatementLineItem>[]) {
  await apiFetch(`/accounting/income-statements/${id}`, { method: "PATCH", body: JSON.stringify({ lineItems }) });
  revalidatePath(REVALIDATE);
}

export async function finalizeIncomeStatement(id: string) {
  await apiFetch(`/accounting/income-statements/${id}/finalize`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function reviseIncomeStatement(id: string) {
  const created = await apiFetch<{ id: string }>(`/accounting/income-statements/${id}/revise`, { method: "POST" });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function acknowledgeIncomeStatement(id: string) {
  await apiFetch(`/accounting/income-statements/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function createAccountingNotes(fiscalYear: number) {
  const created = await apiFetch<{ id: string }>("/accounting/notes", {
    method: "POST",
    body: JSON.stringify({ fiscalYear, sections: [] }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateAccountingNotesSections(id: string, sections: LineItemInput<NotesSection>[]) {
  await apiFetch(`/accounting/notes/${id}`, { method: "PATCH", body: JSON.stringify({ sections }) });
  revalidatePath(REVALIDATE);
}

export async function finalizeAccountingNotes(id: string) {
  await apiFetch(`/accounting/notes/${id}/finalize`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function acknowledgeAccountingNotes(id: string) {
  await apiFetch(`/accounting/notes/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function createManagementReport(fiscalYear: number) {
  const created = await apiFetch<{ id: string }>("/accounting/management-reports", {
    method: "POST",
    body: JSON.stringify({ fiscalYear, sections: [] }),
  });
  revalidatePath(REVALIDATE);
  return created.id;
}

export async function updateManagementReportSections(id: string, sections: LineItemInput<ManagementReportSection>[]) {
  await apiFetch(`/accounting/management-reports/${id}`, { method: "PATCH", body: JSON.stringify({ sections }) });
  revalidatePath(REVALIDATE);
}

export async function finalizeManagementReport(id: string) {
  await apiFetch(`/accounting/management-reports/${id}/finalize`, { method: "POST" });
  revalidatePath(REVALIDATE);
}

export async function acknowledgeManagementReport(id: string) {
  await apiFetch(`/accounting/management-reports/${id}/acknowledge`, { method: "POST" });
  revalidatePath(REVALIDATE);
}
