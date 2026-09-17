import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivity, openClauseCount, toFrontendHandlungsoption } from "@/lib/regstack/outsourcing";
import { getBackendSession, canWriteOutsourcing } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ChecklistPanel } from "@/components/outsourcing/checklist-panel";
import { AuslagerungStatusControl } from "@/components/outsourcing/auslagerung-status-control";
import { DetailTabs } from "@/components/outsourcing/detail-tabs";
import { HandlungsoptionPanel } from "@/components/outsourcing/handlungsoption-panel";
import { NotMigratedNotice } from "@/components/outsourcing/not-migrated-notice";

export default async function AuslagerungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const activity = await getActivity(id);
  if (!activity) notFound();

  const canWrite = canWriteOutsourcing(session.role);
  const offenCount = openClauseCount(activity);

  return (
    <div>
      <Link href="/outsourcing" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Auslagerungsregister
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{activity.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activity.provider ?? "Anbieter nicht erfasst"}
            {activity.category ? ` · ${activity.category}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            {activity.riskAnalysis?.materiality === true && <StatusPill status="wesentlich" />}
            {activity.riskAnalysis?.materiality === false && <StatusPill status="nicht_wesentlich" />}
            <StatusPill status={activity.status.toLowerCase()} />
          </div>
        </div>

        {canWrite && (
          <AuslagerungStatusControl auslagerungId={activity.id} currentStatus={activity.status} offenCount={offenCount} />
        )}
      </div>

      {activity.scope !== "AUSLAGERUNG" && activity.scopeJustification && (
        <Card className="mb-6">
          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Begründung Scope ({activity.scope})
            </p>
            <p className="mt-1 text-sm text-foreground">{activity.scopeJustification}</p>
          </div>
        </Card>
      )}

      <DetailTabs
        tabs={[
          {
            key: "wesentlichkeit",
            label: "Wesentlichkeit",
            content: (
              <NotMigratedNotice reason="Die Wesentlichkeitsanalyse nutzt im neuen Backend ein anderes Klassifizierungsmodell (CSC/Tesla-FS, institutsweit wählbar, siehe RiskAnalysis/classify.ts) als die bisherige Cockpit-Logik. Die Kriterienkataloge stimmen nicht überein — das erfordert eine Produktentscheidung, bevor diese Ansicht migriert wird." />
            ),
          },
          {
            key: "vertrag",
            label: "Vertragscheckliste",
            content: (
              <ChecklistPanel
                auslagerungId={id}
                contract={activity.contract}
                isSubOutsourcing={activity.isSubOutsourcing}
                canWrite={canWrite}
              />
            ),
          },
          {
            key: "handlungsoption",
            label: "Handlungsoption",
            content: (
              <HandlungsoptionPanel
                auslagerungId={id}
                initial={toFrontendHandlungsoption(activity.handlungsoption)}
                canWrite={canWrite}
              />
            ),
          },
          {
            key: "weiterverlagerung",
            label: "Weiterverlagerung",
            content: (
              <NotMigratedNotice reason="Der Backend-Datenmodell (Prisma) kennt bisher nur ein isSubOutsourcing-Flag, aber keine mehrstufige Weiterverlagerungskette (Baumstruktur) — dafür fehlt noch ein eigenes Datenmodell im Backend." />
            ),
          },
          {
            key: "monitoring",
            label: "Monitoring",
            content: (
              <NotMigratedNotice reason="Das Backend modelliert Monitoring als Liste einzelner Evidence-Log-/KPI-Einträge (MonitoringRecord) statt als ein einzelnes bearbeitbares Formular — das Panel muss dafür neu gebaut werden." />
            ),
          },
        ]}
      />
    </div>
  );
}
