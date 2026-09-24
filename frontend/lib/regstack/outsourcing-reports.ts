import { cache } from "react";
import { apiFetch } from "@/lib/regstack/backend-client";
import { listActivities } from "@/lib/regstack/outsourcing";

// MaRisk AT 9 Tz. 13 — jaehrlicher (bzw. bei sehr kleinen Instituten:
// Vorstandssitzungsprotokoll-gestuetzter) Bericht ueber die Auslagerungen an die
// Geschaeftsleitung, mit den drei Pflichtaussagen zu Vertrags-, Steuerungs- und
// Massnahmenlage. Backed by src/modules/reports/ (model Report), mounted at /reports.
export type ReportFormat = "SCHRIFTLICHER_BERICHT" | "VORSTANDSSITZUNGSPROTOKOLL";
export type ReportStatus = "ENTWURF" | "GENEHMIGT";

type BackendReport = {
  id: string;
  period: string;
  createdDate: string;
  conclusionContract: string;
  conclusionSteuerbarkeit: string;
  conclusionMassnahmen: string;
  format: ReportFormat;
  includedActivityIds: string[];
  status: ReportStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
};

export type OutsourcingReport = BackendReport & {
  approvedByName: string | null;
  includedActivityNames: string[];
};

type BackendUser = { id: string; name: string };

const getUserNameMap = cache(async (): Promise<Map<string, string>> => {
  const users = await apiFetch<BackendUser[]>("/users");
  return new Map(users.map((u) => [u.id, u.name]));
});

export async function listOutsourcingReports(): Promise<OutsourcingReport[]> {
  const [reports, names, activities] = await Promise.all([
    apiFetch<BackendReport[]>("/reports"),
    getUserNameMap(),
    listActivities(),
  ]);
  const activityNames = new Map(activities.map((a) => [a.id, a.name]));
  return reports.map((r) => ({
    ...r,
    approvedByName: r.approvedByUserId ? (names.get(r.approvedByUserId) ?? "—") : null,
    includedActivityNames: r.includedActivityIds.map((id) => activityNames.get(id) ?? id),
  }));
}
