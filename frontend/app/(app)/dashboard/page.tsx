import Link from "next/link";
import {
  getLatestReports,
  getPendingAuditPlans,
  getDisputedNormzuweisungen,
  getModuleOverview,
  getAccountingAnalysis,
  getIcsAtAGlance,
  getMonitoringEscalations,
  getPendingDependencyApprovals,
  getPendingExternePruefungen,
} from "@/lib/regstack/dashboard";
import { getBackendSession, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { ReportAckButton } from "@/components/dashboard/report-ack-button";
import { AuditPlanApproveButton } from "@/components/dashboard/audit-plan-approve-button";
import { NormzuweisungDecision } from "@/components/dashboard/normzuweisung-decision";
import { DependencyApprovalButton } from "@/components/dashboard/dependency-approval-button";
import { ExternePruefungAckButton } from "@/components/dashboard/externe-pruefung-ack-button";
import { AccountingAnalysis } from "@/components/buchhaltung/accounting-analysis";
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

  const [reports, auditPlans, disputes, overview, accounting, ics, monitoringEscalations, dependencyApprovals, pendingExternePruefungen] =
    await Promise.all([
      getLatestReports(),
      getPendingAuditPlans(),
      getDisputedNormzuweisungen(),
      getModuleOverview(),
      getAccountingAnalysis(),
      getIcsAtAGlance(),
      getMonitoringEscalations(),
      getPendingDependencyApprovals(),
      getPendingExternePruefungen(),
    ]);

  const actionItemCount =
    auditPlans.length + disputes.length + monitoringEscalations.length + dependencyApprovals.length + pendingExternePruefungen.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Geschäftsleitung — Übersicht</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kennzahlen, Handlungsbedarf und aktuelle Berichte aus allen Modulen.
        </p>
      </div>

      {/* KPI strip — one compact row instead of the former "Modulübersicht" + "Aktuelle Berichte"
          card grids stacked on top of each other. */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Auslagerungen aktiv"
          value={overview.outsourcing.aktiv}
          hint={`${overview.outsourcing.wesentlich} wesentlich · ${overview.outsourcing.offeneEskalationen} Eskalation(en)`}
          tone={overview.outsourcing.offeneEskalationen > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Compliance"
          value={overview.compliance.offeneFeststellungen}
          hint="offene Feststellungen"
          tone={overview.compliance.offeneFeststellungen > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Interne Revision"
          value={overview.internalAudit.offeneFeststellungen}
          hint={`offene Feststellungen, ${overview.internalAudit.pruefungsobjekte} Prüfungsobjekte`}
          tone={overview.internalAudit.offeneFeststellungen > 0 ? "warn" : "good"}
        />
        <StatCard label="IKS-Kontrollen" value={ics.controlCount} hint={`${ics.processCount} Geschäftsprozesse`} />
        <StatCard
          label="IKS-Tests fällig"
          value={ics.dueForTesting}
          hint="ohne abgeschlossenen Test"
          tone={ics.dueForTesting > 0 ? "warn" : "good"}
        />
      </div>

      {/* Action required — every pending Geschäftsleitung decision across all modules lives here,
          visually distinct from the passive KPI/report sections above and below so it never
          blends in with status reporting. Sub-sections only render when they actually have
          something pending, instead of padding the page with empty "nothing here" cards. */}
      {actionItemCount > 0 ? (
        <section className="rounded-2xl border border-status-warning/40 bg-status-warning-bg px-5 py-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangleIcon width={18} height={18} className="text-status-warning" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-status-warning">
              Handlungsbedarf — {actionItemCount} {actionItemCount === 1 ? "Vorgang" : "Vorgänge"}
            </h2>
          </div>

          <div className="space-y-5">
            {auditPlans.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prüfungsplan-Genehmigung</h3>
                <div className="space-y-3">
                  {auditPlans.map((plan) => (
                    <Card key={plan.id} className="border-status-warning/25">
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
              </div>
            )}

            {dependencyApprovals.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependency-Acceptance</h3>
                <div className="space-y-3">
                  {dependencyApprovals.map((d) => (
                    <Card key={d.activityId} className="border-status-warning/25">
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
                            <Button variant="secondary" className="px-2.5 py-1 text-xs">
                              Auslagerung ansehen
                            </Button>
                          </Link>
                        </div>
                        <DependencyApprovalButton activityId={d.activityId} />
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {monitoringEscalations.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monitoring-Eskalationen</h3>
                <div className="space-y-3">
                  {monitoringEscalations.map((e) => (
                    <Card key={e.id} className="border-status-warning/25">
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
                            <Button variant="secondary" className="px-2.5 py-1 text-xs">
                              Auslagerung ansehen
                            </Button>
                          </Link>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingExternePruefungen.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Externe Prüfung — Kenntnisnahme ausstehend
                </h3>
                <div className="space-y-3">
                  {pendingExternePruefungen.map((p) => (
                    <Card key={p.id} className="border-status-warning/25">
                      <CardBody className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {p.pruefer} — {p.jahr}
                          </p>
                          {p.berichtsdatum && <p className="text-xs text-muted-foreground">Bericht vom {p.berichtsdatum}</p>}
                        </div>
                        <ExternePruefungAckButton externePruefungId={p.id} />
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {disputes.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eskalierte Normzuweisungen</h3>
                <div className="space-y-3">
                  {disputes.map((d) => (
                    <Card key={d.id} className="border-status-warning/25">
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
              </div>
            )}
          </div>
        </section>
      ) : (
        <Card className="border-status-success/25 bg-status-success-bg px-5 py-4">
          <p className="text-sm text-status-success">Kein Handlungsbedarf — keine offenen Genehmigungen, Eskalationen oder Widersprüche.</p>
        </Card>
      )}

      {/* Accounting analysis — prominent per design brief, placed right after the action-required
          section rather than buried below the report-status list. */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Buchhaltung — Jahresvergleich</h2>
        <AccountingAnalysis
          bilanzData={accounting.bilanzData}
          bilanzYears={accounting.bilanzYears}
          guvData={accounting.guvData}
          guvYears={accounting.guvYears}
          bilanzMovers={accounting.bilanzMovers}
          guvMovers={accounting.guvMovers}
          compact
        />
        <Link href="/buchhaltung" className="mt-2 inline-block text-xs text-copper-300 hover:underline">
          Vollständige Bilanz- und GuV-Analyse →
        </Link>
      </div>

      {/* Reports status — one compact table instead of three same-weight cards. */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Berichtsstatus je Modul</h2>
        <Card className="divide-y divide-border-subtle">
          {(Object.keys(MODULE_LABEL) as ModuleType[]).map((module) => {
            const report = reports[module];
            return (
              <div key={module} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-[140px]">
                  <p className="text-sm font-medium text-foreground">{MODULE_LABEL[module]}</p>
                </div>
                {!report ? (
                  <p className="text-sm text-muted-foreground">Noch kein Bericht vorhanden.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm capitalize text-foreground">{report.report_type.replaceAll("_", " ")}</span>
                      <StatusPill status={report.status} />
                      {report.period_from && (
                        <span className="text-xs text-muted-foreground">
                          {report.period_from} – {report.period_to}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === "final" &&
                        (module === "compliance" ? (
                          report.acknowledgedByMe ? (
                            <span className="text-xs text-status-success">Kenntnisnahme erfasst</span>
                          ) : (
                            <ReportAckButton reportId={report.id} module={module} />
                          )
                        ) : report.kenntnisnahme_at ? (
                          <span className="text-xs text-status-success">
                            Kenntnisnahme am {new Date(report.kenntnisnahme_at).toLocaleDateString("de-DE")}
                          </span>
                        ) : (
                          <ReportAckButton reportId={report.id} module={module} />
                        ))}
                      {REPORT_HREF[module] && (
                        <Link href={REPORT_HREF[module]!(report.report_type)}>
                          <Button variant="secondary" className="px-2.5 py-1 text-xs">
                            Ansehen
                          </Button>
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
