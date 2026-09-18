import {
  listUniversum, listAuditPlans, listAllPersons, listPruefungen, getRevisionEinstellungen,
  universeStatus, type Risikokriterien,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { UniversumTable, type UniversumRow } from "@/components/revisions/universum/universum-table";
import { UniversumAdd } from "@/components/revisions/universum/universum-add";
import { PlanCard, type AuditPlanRow } from "@/components/revisions/universum/plan-card";

export default async function PruefungsuniversumPage() {
  const session = await getBackendSession();
  const canWrite = session ? canWriteRevisions(session.role) : false;
  const isGL = session ? isGeschaeftsleitung(session.role) : false;

  const [universum, plans, personen, pruefungen, einstellungen] = await Promise.all([
    listUniversum(), listAuditPlans(), listAllPersons(), listPruefungen(), getRevisionEinstellungen(),
  ]);

  const year = new Date().getFullYear();
  const riskIntervalMonate = einstellungen?.risiko_review_intervall_monate ?? 12;

  const statuses = universum.map((u) => universeStatus(u.last_audit_date, u.materiality, (u.risikokriterien ?? {}) as Risikokriterien));
  const overdue = statuses.filter((s) => s === "overdue" || s === "never").length;
  const dueSoon = statuses.filter((s) => s === "due_soon").length;
  const onTime = statuses.filter((s) => s === "on_time").length;

  const plannedDays = pruefungen
    .filter((p) => (p.period_from ?? p.created_at)?.slice(0, 4) === String(year))
    .reduce((sum, p) => sum + (Number(p.budget_days) || 0), 0);

  return (
    <div className="space-y-6">
      <Banner tone="crit" title="Das Prüfungsuniversum ist der Taktgeber des Jahresplans, kein bloßes Verzeichnis">
        Sämtliche Aktivitäten und Prozesse des Instituts einschließlich ausgelagerter Tätigkeiten (Tz. 5) — Risikobewertung
        nach Tz. 6 S.2 (Risikopotenzial, Veränderungen, Risikoquellen, Manipulationsanfälligkeit). Grundsatz: Prüfung aller
        Aktivitäten innerhalb von drei Jahren (kürzer bei besonderen Risiken); nicht wesentliche Aktivitäten innerhalb von
        fünf Jahren.
      </Banner>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Prüfungsobjekte gesamt" value={universum.length} />
        <StatCard label="überfällig / nie geprüft" value={overdue} tone={overdue ? "crit" : "good"} />
        <StatCard label="bald fällig" value={dueSoon} tone={dueSoon ? "warn" : "good"} />
        <StatCard label="im Plan" value={onTime} tone="good" />
      </div>

      <PlanCard plans={plans as unknown as AuditPlanRow[]} year={year} plannedDays={plannedDays} canWrite={canWrite} isGL={isGL} />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Prüfungsuniversum</h2>
            <p className="text-xs text-muted-foreground">Vollständigkeit ist prüfbar über den regulatorischen Anker je Objekt.</p>
          </div>
          {canWrite && <UniversumAdd personen={personen} />}
        </div>
        <div className="p-5 pt-3">
          <UniversumTable rows={universum as unknown as UniversumRow[]} riskIntervalMonate={riskIntervalMonate} />
        </div>
      </Card>
    </div>
  );
}
