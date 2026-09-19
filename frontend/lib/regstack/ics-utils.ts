// Pure types/constants/helpers with no server-only dependency — split out of ics.ts (which pulls
// in apiFetch -> next/headers) so Client Components can import labels and types without dragging
// a server-only module into the client bundle. Mirrors the revisions.ts/revisions-utils.ts split.

export const CONTROL_TYPE_LABELS: Record<"ITGC" | "AUTOMATED" | "MANUAL", string> = {
  ITGC: "ITGC",
  AUTOMATED: "Automatisiert",
  MANUAL: "Manuell",
};

export const CONTROL_FREQUENCY_LABELS: Record<
  "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "AD_HOC" | "PER_TRANSACTION",
  string
> = {
  DAILY: "Täglich",
  WEEKLY: "Wöchentlich",
  MONTHLY: "Monatlich",
  QUARTERLY: "Quartalsweise",
  ANNUALLY: "Jährlich",
  AD_HOC: "Ad hoc",
  PER_TRANSACTION: "Je Transaktion",
};

export const TEST_STATUS_LABELS: Record<"PLANNED" | "IN_PROGRESS" | "COMPLETED", string> = {
  PLANNED: "geplant",
  IN_PROGRESS: "in Bearbeitung",
  COMPLETED: "abgeschlossen",
};

export const TEST_RESULT_LABELS: Record<"EFFECTIVE" | "DEFICIENT" | "NOT_TESTED", string> = {
  EFFECTIVE: "wirksam",
  DEFICIENT: "mangelhaft",
  NOT_TESTED: "nicht getestet",
};

export type BusinessProcess = {
  id: string;
  name: string;
  owner: string | null;
  description: string | null;
  controlCount?: number;
  controls?: Control[];
  policies?: PolicyDocument[];
};

export type Control = {
  id: string;
  name: string;
  controlType: keyof typeof CONTROL_TYPE_LABELS;
  description: string | null;
  frequency: keyof typeof CONTROL_FREQUENCY_LABELS;
  controlOwnerUserId: string | null;
  risksAddressed: string | null;
  active: boolean;
  businessProcesses?: BusinessProcess[];
  policies?: PolicyDocument[];
  tests?: ControlTest[];
  testCount?: number;
};

export type ControlTestEvidence = {
  id: string;
  fileObjectKey: string;
  fileName: string;
  fileMime: string | null;
  uploadedAt: string;
};

export type ControlTest = {
  id: string;
  controlId: string;
  plannedPeriod: string | null;
  plannedDate: string | null;
  status: keyof typeof TEST_STATUS_LABELS;
  result: keyof typeof TEST_RESULT_LABELS | null;
  resultNotes: string | null;
  testedByUserId: string | null;
  testedAt: string | null;
  evidence: ControlTestEvidence[];
  control?: { name: string };
};

export type PolicyDocument = {
  id: string;
  title: string;
  description: string | null;
  documentType: string | null;
  fileObjectKey: string | null;
  fileName: string | null;
  uploadedAt: string | null;
  businessProcesses?: BusinessProcess[];
  controls?: Control[];
};

/** Controls due for testing: no test at all, or their latest test's planned date has passed
 * without a COMPLETED result. Used by the process/control detail pages and the dashboard's
 * IKS at-a-glance stat. */
export function controlsDueForTesting(controls: Control[], tests: ControlTest[]): number {
  const now = new Date();
  return controls.filter((c) => {
    const controlTests = tests.filter((t) => t.controlId === c.id);
    if (controlTests.length === 0) return true;
    const latest = [...controlTests].sort((a, b) => (b.plannedDate ?? "").localeCompare(a.plannedDate ?? ""))[0];
    if (latest.status === "COMPLETED") return false;
    return latest.plannedDate ? new Date(latest.plannedDate) <= now : false;
  }).length;
}
