import {
  listRisikoinventur,
  listRisikostrategien,
  listRisikotragfaehigkeit,
  listRmReports,
  listAufsichtsorganBerichte,
} from "@/lib/regstack/risikomanagement";
import { getBackendSession, canWriteRiskManagement, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { isOverdue } from "@/lib/regstack/compliance-utils";
import { StatCard } from "@/components/ui/stat-card";
import { RisikoinventurPanel } from "@/components/risikomanagement/risikoinventur-panel";
import { StrategiePanel } from "@/components/risikomanagement/strategie-panel";
import { RtfPanel } from "@/components/risikomanagement/rtf-panel";
import { ReportPanel } from "@/components/risikomanagement/report-panel";
import { AufsichtsorganBerichtPanel } from "@/components/risikomanagement/aufsichtsorgan-bericht-panel";

export default async function RisikomanagementPage() {
  const session = await getBackendSession();
  if (!session) return null; // layout.tsx already renders the "nicht verknüpft" state

  const [inventur, strategien, rtfSnapshots, reports, aufsichtsorganBerichte] = await Promise.all([
    listRisikoinventur(),
    listRisikostrategien(),
    listRisikotragfaehigkeit(),
    listRmReports(),
    listAufsichtsorganBerichte(),
  ]);

  const canWrite = canWriteRiskManagement(session.role);
  const canApprove = isGeschaeftsleitung(session.role);

  const wesentlich = inventur.filter((i) => i.wesentlichkeit === "wesentlich").length;
  const latestRtf = rtfSnapshots[0] ?? null;
  const limitWerte = latestRtf ? Object.values(latestRtf.limits).map((l) => l.auslastungProzent ?? 0) : [];
  const kritischeLimits = limitWerte.filter((v) => v >= 90).length;
  const overdueStrategien = strategien.filter((s) => isOverdue(s.naechsteUeberpruefung ? s.naechsteUeberpruefung.slice(0, 10) : null)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Wesentliche Risikoarten" value={wesentlich} hint={`von ${inventur.length} im Inventar geführt`} />
        <StatCard
          label="RTF-Auslastung gesamt"
          value={latestRtf?.auslastungGesamt != null ? `${latestRtf.auslastungGesamt} %` : "—"}
          hint={latestRtf ? `${latestRtf.ansatz === "oekonomisch" ? "ökonomisch" : "normativ"} · ${latestRtf.periode}` : "noch kein Snapshot"}
          tone={latestRtf?.auslastungGesamt != null && latestRtf.auslastungGesamt >= 90 ? "crit" : "good"}
        />
        <StatCard
          label="Limit kritisch ausgelastet"
          value={kritischeLimits}
          hint={kritischeLimits ? "≥ 90 % Auslastung" : "keine Risikoart über 90 %"}
          tone={kritischeLimits ? "crit" : "good"}
        />
        <StatCard
          label="Review überfällig"
          value={overdueStrategien}
          hint={overdueStrategien ? "Strategie(n) mit abgelaufener Überprüfungsfrist" : "alle Strategien im Plan"}
          tone={overdueStrategien ? "warn" : "good"}
        />
      </div>

      <RisikoinventurPanel items={inventur} canWrite={canWrite} />
      <StrategiePanel items={strategien} canWrite={canWrite} canApprove={canApprove} />
      <RtfPanel items={rtfSnapshots} canWrite={canWrite} />
      <ReportPanel reports={reports} canWrite={canWrite} canAcknowledge={canApprove} currentUserId={session.userId} />
      <AufsichtsorganBerichtPanel berichte={aufsichtsorganBerichte} canWrite={canApprove} />
    </div>
  );
}
