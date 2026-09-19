import Link from "next/link";
import { getBackendSession, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import {
  getLatestReports,
  getPendingAuditPlans,
  getDisputedNormzuweisungen,
  getModuleOverview,
  getMonitoringEscalations,
  getPendingDependencyApprovals,
  getPendingExternePruefungen,
} from "@/lib/regstack/dashboard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ReportAckButton } from "@/components/dashboard/report-ack-button";
import { AuditPlanApproveButton } from "@/components/dashboard/audit-plan-approve-button";
import { NormzuweisungDecision } from "@/components/dashboard/normzuweisung-decision";
import { DependencyApprovalButton } from "@/components/dashboard/dependency-approval-button";
import { ExternePruefungAckButton } from "@/components/dashboard/externe-pruefung-ack-button";
import type { Database } from "@/lib/database.types";

type ModuleType = Database["public"]["Enums"]["module_type"];

const MODULE_LABEL: Record<ModuleType, string> = {
  outsourcing: "Outsourcing",
  compliance: "Compliance",
  internal_audit: "Interne Revision",
};

// Outsourcing has no board-report page yet (lib/regstack/dashboard.ts: its report row is always
// null), so it has no entry here — the link only renders when a module both has a report page
// AND getLatestReports() found a row for it.
const REPORT_HREF: Partial<Record<ModuleType, (reportType: string) => string>> = {
  compliance: () => "/compliance/bericht",
  internal_audit: (reportType) => `/interne-revision/${reportType}`,
};

export default async function DashboardPage() {
  const session = await getBackendSession();

  if (!session || !isGeschaeftsleitung(session.role)) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Dieses Dashboard ist der Geschäftsleitung vorbehalten.</p>
      </Card>
    );
  }

  const [reports, auditPlans, disputes, overview, monitoringEscalations, dependencyApprovals, pendingExternePruefungen] = await Promise.all([
    getLatestReports(),
    getPendingAuditPlans(),
    getDisputedNormzuweisungen(),
    getModuleOverview(),
    getMonitoringEscalations(),
    getPendingDependencyApprovals(),
    getPendingExternePruefungen(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Geschäftsleitung — Übersicht</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktuelle Berichte, Prüfungsplan-Genehmigung und eskalierte Normzuweisungen aus allen drei Modulen.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Modulübersicht</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outsourcing</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview.outsourcing.aktiv}</p>
              <p className="text-xs text-muted-foreground">aktive Auslagerungen, davon {overview.outsourcing.wesentlich} wesentlich</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {overview.outsourcing.offeneEskalationen} Monitoring-Eskalation(en) · {overview.outsourcing.offeneVertragspunkte} mit offenen Vertragspunkten
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Compliance</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview.compliance.offeneFeststellungen}</p>
              <p className="text-xs text-muted-foreground">offene Feststellungen</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Interne Revision</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{overview.internalAudit.pruefungsobjekte}</p>
              <p className="text-xs text-muted-foreground">Prüfungsobjekte, {overview.internalAudit.offeneFeststellungen} offene Feststellungen</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Aktuelle Berichte je Modul</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(MODULE_LABEL) as ModuleType[]).map((module) => {
            const report = reports[module];
            return (
              <Card key={module}>
                <CardHeader>
                  <CardTitle>{MODULE_LABEL[module]}</CardTitle>
                </CardHeader>
                <CardBody>
                  {!report ? (
                    <p className="text-sm text-muted-foreground">Noch kein Bericht vorhanden.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground capitalize">{report.report_type.replaceAll("_", " ")}</span>
                        <StatusPill status={report.status} />
                      </div>
                      {report.period_from && (
                        <p className="text-xs text-muted-foreground">
                          Zeitraum: {report.period_from} – {report.period_to}
                        </p>
                      )}
                      {report.status === "final" &&
                        (module === "compliance" ? (
                          report.acknowledgedByMe ? (
                            <p className="text-xs text-status-success">Kenntnisnahme erfasst</p>
                          ) : (
                            <ReportAckButton reportId={report.id} module={module} />
                          )
                        ) : report.kenntnisnahme_at ? (
                          <p className="text-xs text-status-success">
                            Kenntnisnahme am {new Date(report.kenntnisnahme_at).toLocaleDateString("de-DE")}
                          </p>
                        ) : (
                          <ReportAckButton reportId={report.id} module={module} />
                        ))}
                      {REPORT_HREF[module] && (
                        <Link href={REPORT_HREF[module]!(report.report_type)} className="block pt-1">
                          <Button variant="secondary" className="w-full">
                            Bericht ansehen
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      {pendingExternePruefungen.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Externe Prüfung — Kenntnisnahme ausstehend</h2>
          <div className="space-y-3">
            {pendingExternePruefungen.map((p) => (
              <Card key={p.id}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.pruefer} — {p.jahr}</p>
                    {p.berichtsdatum && <p className="text-xs text-muted-foreground">Bericht vom {p.berichtsdatum}</p>}
                  </div>
                  <ExternePruefungAckButton externePruefungId={p.id} />
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Prüfungsplan-Genehmigung</h2>
        {auditPlans.length === 0 ? (
          <Card className="px-5 py-6">
            <p className="text-sm text-muted-foreground">Kein Prüfungsplan wartet aktuell auf Genehmigung.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {auditPlans.map((plan) => (
              <Card key={plan.id}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Jahres-Prüfungsplan {plan.year}</p>
                    {plan.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Eingereicht am {new Date(plan.submitted_at).toLocaleDateString("de-DE")}
                      </p>
                    )}
                  </div>
                  <AuditPlanApproveButton auditPlanId={plan.id} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Dependency-Acceptance ausstehend</h2>
        {dependencyApprovals.length === 0 ? (
          <Card className="px-5 py-6">
            <p className="text-sm text-muted-foreground">Keine Dependency-Acceptance wartet aktuell auf Genehmigung.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {dependencyApprovals.map((d) => (
              <Card key={d.activityId}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.activityName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        BCM-Anbindung (Tz. 6) — Ersetzbarkeit: {d.ersetzbarkeit ?? "—"}
                        {d.reviewDate && ` · Nächste Überprüfung: ${new Date(d.reviewDate).toLocaleDateString("de-DE")}`}
                      </p>
                      {d.depControls && <p className="mt-1.5 text-xs text-muted-foreground">{d.depControls}</p>}
                    </div>
                    <Link href={`/outsourcing/${d.activityId}`} className="shrink-0">
                      <Button variant="secondary" className="px-2.5 py-1 text-xs">Auslagerung ansehen</Button>
                    </Link>
                  </div>
                  <DependencyApprovalButton activityId={d.activityId} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Offene Monitoring-Eskalationen</h2>
        {monitoringEscalations.length === 0 ? (
          <Card className="px-5 py-6">
            <p className="text-sm text-muted-foreground">Keine offenen Eskalationen aus dem Auslagerungsmonitoring.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {monitoringEscalations.map((e) => (
              <Card key={e.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.activityName}</p>
                      {e.evidenceDescription && <p className="mt-1 text-xs text-muted-foreground">{e.evidenceDescription}</p>}
                      {e.evidenceDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stand: {new Date(e.evidenceDate).toLocaleDateString("de-DE")}
                        </p>
                      )}
                      {e.escalationNote && (
                        <p className="mt-1.5 rounded bg-status-warning-bg px-2 py-1 text-xs text-status-warning">{e.escalationNote}</p>
                      )}
                    </div>
                    <Link href={`/outsourcing/${e.activityId}`} className="shrink-0">
                      <Button variant="secondary" className="px-2.5 py-1 text-xs">Auslagerung ansehen</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Eskalierte Normzuweisungen</h2>
        {disputes.length === 0 ? (
          <Card className="px-5 py-6">
            <p className="text-sm text-muted-foreground">Keine widersprochenen Normzuweisungen offen.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <Card key={d.id}>
                <CardBody>
                  <p className="text-sm font-medium text-foreground">{d.normBezeichnung}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vorschlag: {d.proposedByName} · Widerspruch von: {d.targetName}
                  </p>
                  {d.dispute_reason && (
                    <p className="mt-1.5 rounded bg-status-warning-bg px-2 py-1 text-xs text-status-warning">
                      Widerspruchsgrund: {d.dispute_reason}
                    </p>
                  )}
                  <NormzuweisungDecision handshakeId={d.id} normId={d.entity_id ?? ""} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
