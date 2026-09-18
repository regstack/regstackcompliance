import Link from "next/link";
import { getBackendSession, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { getLatestReports, getPendingAuditPlans, getDisputedNormzuweisungen, getModuleOverview } from "@/lib/regstack/dashboard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ReportAckButton } from "@/components/dashboard/report-ack-button";
import { AuditPlanApproveButton } from "@/components/dashboard/audit-plan-approve-button";
import { NormzuweisungDecision } from "@/components/dashboard/normzuweisung-decision";
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

  const [reports, auditPlans, disputes, overview] = await Promise.all([
    getLatestReports(),
    getPendingAuditPlans(),
    getDisputedNormzuweisungen(),
    getModuleOverview(),
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
