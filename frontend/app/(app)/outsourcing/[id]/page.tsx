import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivity, getWeiterverlagerungskette, openClauseCount, toFrontendHandlungsoption } from "@/lib/regstack/outsourcing";
import {
  getBackendSession, canWriteOutsourcing, canWriteOutsourcingContract, isGeschaeftsleitung,
} from "@/lib/regstack/backend-session";
import { getInstitutionSettings } from "@/lib/regstack/institution";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ChecklistPanel } from "@/components/outsourcing/checklist-panel";
import { ContractFilePanel } from "@/components/outsourcing/contract-file-panel";
import { AuslagerungStatusControl } from "@/components/outsourcing/auslagerung-status-control";
import { DetailTabs } from "@/components/outsourcing/detail-tabs";
import { HandlungsoptionPanel } from "@/components/outsourcing/handlungsoption-panel";
import { WesentlichkeitPanel } from "@/components/outsourcing/wesentlichkeit-panel";
import { MonitoringPanel } from "@/components/outsourcing/monitoring-panel";
import { WeiterverlagerungTree } from "@/components/outsourcing/weiterverlagerung-tree";

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

  const [institution, kette] = await Promise.all([getInstitutionSettings(), getWeiterverlagerungskette(id)]);

  const canWrite = canWriteOutsourcing(session.role);
  const canWriteContract = canWriteOutsourcingContract(session.role);
  const canApproveHandlungsoption = isGeschaeftsleitung(session.role);
  const offenCount = openClauseCount(activity);

  return (
    <div>
      <Link href="/outsourcing" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Auslagerungsregister
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{activity.name}</h1>
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
          <AuslagerungStatusControl
            activityId={activity.id}
            currentStatus={activity.status}
            wesentlich={activity.riskAnalysis?.materiality === true}
            offenCount={offenCount}
          />
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
              <WesentlichkeitPanel
                activityId={id}
                initial={activity.riskAnalysis}
                deepDive={activity.deepDive}
                institution={institution}
                canWrite={canWrite}
              />
            ),
          },
          {
            key: "vertrag",
            label: "Vertragscheckliste",
            content: (
              <>
                <ContractFilePanel activityId={id} contract={activity.contract} canWrite={canWriteContract} />
                <ChecklistPanel
                  auslagerungId={id}
                  contract={activity.contract}
                  isSubOutsourcing={activity.isSubOutsourcing}
                  canWrite={canWriteContract}
                />
              </>
            ),
          },
          {
            key: "handlungsoption",
            label: "Handlungsoption",
            content: (
              <HandlungsoptionPanel
                auslagerungId={id}
                initial={toFrontendHandlungsoption(activity.handlungsoption)}
                canWrite={canWriteContract}
                canApprove={canApproveHandlungsoption}
              />
            ),
          },
          {
            key: "weiterverlagerung",
            label: "Weiterverlagerung",
            content: <WeiterverlagerungTree activityId={id} kette={kette} canWrite={canWriteContract} />,
          },
          {
            key: "monitoring",
            label: "Monitoring",
            content: (
              <MonitoringPanel activityId={id} records={activity.monitoringRecords ?? []} canWrite={canWrite} />
            ),
          },
        ]}
      />
    </div>
  );
}
