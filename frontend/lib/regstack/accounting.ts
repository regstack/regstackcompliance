import { apiFetch } from "@/lib/regstack/backend-client";
import type { MoverDatum } from "@/components/buchhaltung/charts/biggest-movers";
import type { YearSeriesDatum } from "@/components/buchhaltung/charts/year-over-year-bar-chart";

export type AccountingDocStatus = "entwurf" | "final";
export type SignOff = { id: string; userId: string; acknowledgedAt: string };
export type AccountingDocumentFile = {
  fileObjectKey: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
  uploadedAt: string;
  uploadedByUserId: string;
};

export const BILANZ_SECTION_LABELS: Record<string, string> = {
  ANLAGEVERMOEGEN: "Anlagevermögen",
  UMLAUFVERMOEGEN: "Umlaufvermögen",
  RECHNUNGSABGRENZUNG_AKTIVA: "Aktive Rechnungsabgrenzung",
  EIGENKAPITAL: "Eigenkapital",
  RUECKSTELLUNGEN: "Rückstellungen",
  VERBINDLICHKEITEN: "Verbindlichkeiten",
  RECHNUNGSABGRENZUNG_PASSIVA: "Passive Rechnungsabgrenzung",
};

export const GUV_SECTION_LABELS: Record<string, string> = {
  ERTRAEGE: "Erträge",
  AUFWENDUNGEN: "Aufwendungen",
  ERGEBNIS: "Ergebnis",
};

export type BalanceSheetLineItem = {
  id: string;
  side: "AKTIVA" | "PASSIVA";
  section: string;
  label: string;
  currentAmount: number;
  priorYearAmount: number | null;
  sortOrder: number;
};

export type BalanceSheet = {
  id: string;
  fiscalYear: number;
  periodLabel: string | null;
  status: AccountingDocStatus;
  finalizedAt: string | null;
  previousVersionId: string | null;
  createdAt: string;
  lineItems: BalanceSheetLineItem[];
  signOffs: SignOff[];
  file: AccountingDocumentFile | null;
};

export type IncomeStatementLineItem = {
  id: string;
  section: string;
  label: string;
  currentAmount: number;
  priorYearAmount: number | null;
  sortOrder: number;
};

export type IncomeStatement = {
  id: string;
  fiscalYear: number;
  periodLabel: string | null;
  status: AccountingDocStatus;
  finalizedAt: string | null;
  previousVersionId: string | null;
  createdAt: string;
  lineItems: IncomeStatementLineItem[];
  signOffs: SignOff[];
  file: AccountingDocumentFile | null;
};

export type NotesSection = { id: string; title: string; content: string; linkedLineItemLabel: string | null; sortOrder: number };
export type AccountingNotes = {
  id: string;
  fiscalYear: number;
  status: AccountingDocStatus;
  finalizedAt: string | null;
  createdAt: string;
  sections: NotesSection[];
  signOffs: SignOff[];
  file: AccountingDocumentFile | null;
};

export type ManagementReportSection = { id: string; title: string; content: string; sortOrder: number };
export type ManagementReport = {
  id: string;
  fiscalYear: number;
  status: AccountingDocStatus;
  finalizedAt: string | null;
  createdAt: string;
  sections: ManagementReportSection[];
  signOffs: SignOff[];
  file: AccountingDocumentFile | null;
};

export async function listBalanceSheets(): Promise<BalanceSheet[]> {
  return apiFetch<BalanceSheet[]>("/accounting/balance-sheets");
}
export async function getBalanceSheet(id: string): Promise<BalanceSheet> {
  return apiFetch<BalanceSheet>(`/accounting/balance-sheets/${id}`);
}
export async function listIncomeStatements(): Promise<IncomeStatement[]> {
  return apiFetch<IncomeStatement[]>("/accounting/income-statements");
}
export async function getIncomeStatement(id: string): Promise<IncomeStatement> {
  return apiFetch<IncomeStatement>(`/accounting/income-statements/${id}`);
}
export async function listAccountingNotes(): Promise<AccountingNotes[]> {
  return apiFetch<AccountingNotes[]>("/accounting/notes");
}
export async function getAccountingNotes(id: string): Promise<AccountingNotes> {
  return apiFetch<AccountingNotes>(`/accounting/notes/${id}`);
}
export async function listManagementReports(): Promise<ManagementReport[]> {
  return apiFetch<ManagementReport[]>("/accounting/management-reports");
}
export async function getManagementReport(id: string): Promise<ManagementReport> {
  return apiFetch<ManagementReport>(`/accounting/management-reports/${id}`);
}

function formatYear(fiscalYear: number) {
  return String(fiscalYear);
}

/** Sums each document's line items by section, one row per section with one column per fiscal
 * year — the shape the grouped YearOverYearBarChart wants. Shared by the Bilanz analysis page and
 * the dashboard's accounting widget so both read the same numbers the same way. */
export function buildBilanzSectionTotals(sheets: BalanceSheet[]): { data: YearSeriesDatum[]; years: number[] } {
  const years = [...new Set(sheets.map((s) => s.fiscalYear))].sort((a, b) => a - b);
  const sections = Object.keys(BILANZ_SECTION_LABELS) as (keyof typeof BILANZ_SECTION_LABELS)[];
  const data: YearSeriesDatum[] = sections.map((section) => {
    const row: YearSeriesDatum = { category: BILANZ_SECTION_LABELS[section] };
    for (const year of years) {
      const sheet = sheets.find((s) => s.fiscalYear === year);
      const total = sheet?.lineItems.filter((li) => li.section === section).reduce((sum, li) => sum + li.currentAmount, 0) ?? 0;
      row[formatYear(year)] = Math.round(total);
    }
    return row;
  });
  return { data, years };
}

export function buildGuvSectionTotals(statements: IncomeStatement[]): { data: YearSeriesDatum[]; years: number[] } {
  const years = [...new Set(statements.map((s) => s.fiscalYear))].sort((a, b) => a - b);
  const sections = Object.keys(GUV_SECTION_LABELS) as (keyof typeof GUV_SECTION_LABELS)[];
  const data: YearSeriesDatum[] = sections.map((section) => {
    const row: YearSeriesDatum = { category: GUV_SECTION_LABELS[section] };
    for (const year of years) {
      const statement = statements.find((s) => s.fiscalYear === year);
      const total = statement?.lineItems.filter((li) => li.section === section).reduce((sum, li) => sum + li.currentAmount, 0) ?? 0;
      row[formatYear(year)] = Math.round(total);
    }
    return row;
  });
  return { data, years };
}

/** Ranks the line items with the largest year-over-year swing between the two most recent fiscal
 * years present, matched by label (the same line item across two yearly documents). Used for the
 * "biggest movers" chart on both the Bilanz/GuV pages and the dashboard widget. */
export function buildBiggestMovers(
  docs: { fiscalYear: number; lineItems: { label: string; currentAmount: number }[] }[],
  limit = 5
): MoverDatum[] {
  const years = [...new Set(docs.map((d) => d.fiscalYear))].sort((a, b) => b - a);
  if (years.length < 2) return [];
  const [latestYear, priorYear] = years;
  const latest = docs.find((d) => d.fiscalYear === latestYear);
  const prior = docs.find((d) => d.fiscalYear === priorYear);
  if (!latest || !prior) return [];

  const priorByLabel = new Map(prior.lineItems.map((li) => [li.label, li.currentAmount]));
  const movers: MoverDatum[] = latest.lineItems
    .filter((li) => priorByLabel.has(li.label))
    .map((li) => {
      const priorAmount = priorByLabel.get(li.label)!;
      const changeAbs = li.currentAmount - priorAmount;
      const changePct = priorAmount !== 0 ? (changeAbs / Math.abs(priorAmount)) * 100 : 0;
      return { label: li.label, changeAbs, changePct };
    })
    .filter((m) => m.changeAbs !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit)
    .sort((a, b) => b.changePct - a.changePct);

  return movers;
}
