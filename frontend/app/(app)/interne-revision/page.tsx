import {
  listUniversum, listAuditPlans, listPruefungen, listFeststellungen, listQualitaetssicherung,
  listZugriffsvorfaelle, listFristverlaengerungen, listAuditLog, getRevisionEinstellungen,
  universeStatus, cycleYears, nextDueDate, daysUntil, today, execEscalationOpen, findingStage,
  type Escalation, type ExecEscalation, type Risikokriterien, type FindingStage,
} from "@/lib/regstack/revisions";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardBanners } from "@/components/revisions/dashboard/dashboard-banners";
import { NextDueTable, type NextDueRow } from "@/components/revisions/dashboard/next-due-table";
import { RecentActivity } from "@/components/revisions/dashboard/recent-activity";
import { Walkthrough, type WalkthroughStep } from "@/components/ui/walkthrough";

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Revisions-Dashboard",
    body: "Prüfungsplan-Abdeckung, überfällige Prüfobjekte und wesentliche Feststellungen mit Eskalationsstufen auf einen Blick.",
  },
  {
    title: "Prüfungsuniversum & Plan",
    body: "Zyklen, Fälligkeiten und der Jahresplan der Revision — Tz. 6.",
  },
  {
    title: "Prüfungen & Feststellungen",
    body: "Prüfungen, Feststellungen & Nachverfolgung sowie externe Prüfungen finden Sie in der Seitenleiste — Tz. 7–12.",
  },
  {
    title: "Berichte, QS & Einstellungen",
    body: "Quartals- und Jahresbericht, Governance/QS/Projekte sowie Audit-Trail, Export und Einstellungen runden das Modul ab.",
  },
];

export default async function RevisionDashboardPage() {
  const [universum, plans, pruefungen, feststellungen, qs, incidents, auditLog, einstellungen] = await Promise.all([
    listUniversum(), listAuditPlans(), listPruefungen(), listFeststellungen(), listQualitaetssicherung(),
    listZugriffsvorfaelle(), listAuditLog(), getRevisionEinstellungen(),
  ]);

  const angemesseneZeitTage = einstellungen?.angemessene_zeit_tage ?? 90;
  const qsIntervallMonate = einstellungen?.qs_intervall_monate ?? 12;
  const currentYear = new Date(today()).getUTCFullYear();

  /* ---- Prüfungsuniversum: Status, Abdeckung, nächste Fälligkeiten (Tz. 6) ---- */
  const univWithStatus = universum.map((u) => ({
    ...u,
    dbStatus: u.status,
    status: universeStatus(u.last_audit_date, u.materiality, u.risikokriterien as Risikokriterien),
    cycle: cycleYears(u.materiality, u.risikokriterien as Risikokriterien),
    nextDue: nextDueDate(u.last_audit_date, u.materiality, u.risikokriterien as Risikokriterien),
  }));
  const overdueUniv = univWithStatus.filter((u) => u.status === "overdue");
  const plannedThisYear = univWithStatus.filter((u) => u.plan_year === currentYear);
  // "abgeschlossen" = Prüfungsobjekt-Status selbst steht auf abgeschlossen (siehe pruefungsobjekte.status)
  const completedPlanned = plannedThisYear.filter((u) => u.dbStatus === "abgeschlossen");
  const coveragePct = plannedThisYear.length ? Math.round((100 * completedPlanned.length) / plannedThisYear.length) : null;

  const upcoming: NextDueRow[] = univWithStatus
    .slice()
    .sort((a, b) => (daysUntil(a.nextDue) ?? 0) - (daysUntil(b.nextDue) ?? 0))
    .slice(0, 8)
    .map((u) => ({ id: u.id, bezeichnung: u.bezeichnung, cycleYears: u.cycle, nextDue: u.nextDue, status: u.status }));

  /* ---- Feststellungen: offene wesentliche Mängel, Eskalationsstufen (Tz. 8, 9, 12) ---- */
  const openFindings = feststellungen.filter((f) => f.status !== "geschlossen");
  const wesentlicheOpen = openFindings.filter((f) => f.schweregrad !== "geringfuegig");
  const besondersOpen = wesentlicheOpen.filter((f) => f.schweregrad === "besonders_schwerwiegend");
  const execEscalationOpenFindings = openFindings.filter((f) =>
    execEscalationOpen(f.executive_target, f.schweregrad, f.exec_escalation as ExecEscalation)
  );

  const wesentlicheOpenWithDueDate = await Promise.all(
    wesentlicheOpen.map(async (f) => {
      const verlaengerungen = await listFristverlaengerungen(f.id);
      const effectiveDueDate = verlaengerungen.length ? verlaengerungen[verlaengerungen.length - 1].neu : f.frist_urspruenglich;
      const stage: FindingStage = findingStage(
        { status: f.status, abschluss_art: f.abschluss_art, schweregrad: f.schweregrad, escalation: f.escalation as Escalation, effective_due_date: effectiveDueDate },
        angemesseneZeitTage
      );
      return { ...f, stage };
    })
  );
  const eskalationFaellig = wesentlicheOpenWithDueDate.filter((f) => f.stage === "eskalation_faellig");
  const gesamtGlFaellig = wesentlicheOpenWithDueDate.filter((f) => f.stage === "gesamte_gl_faellig");

  /* ---- Qualitätssicherung der Revisionsfunktion selbst (Tz. 1 S.2) ---- */
  const qsOverdueRows = qs.filter((q) => q.next_due && (daysUntil(q.next_due) ?? 0) < 0);
  const lastQs = qs[0] ?? null;

  /* ---- Informations- und Zugriffsrecht (Tz. 1 S.3/4) ---- */
  const openIncidents = incidents.filter((i) => !i.resolved_date);

  /* ---- Kapazität gegen genehmigten Plan (Tz. 9) ---- */
  const approvedPlan = plans.find((p) => p.year === currentYear && p.approved_at);
  const kapazitaet = Number((approvedPlan?.content as { kapazitaetPT?: number } | null)?.kapazitaetPT) || 0;
  const plannedDays = pruefungen
    .filter((p) => (p.report_date || p.period_from || "").slice(0, 4) === String(currentYear) || p.status !== "abgeschlossen")
    .reduce((n, p) => n + (Number(p.budget_days) || 0), 0);
  const kapazitaetOver = kapazitaet > 0 && plannedDays > kapazitaet;

  return (
    <div className="space-y-8">
      <Walkthrough id="interne-revision-dashboard" steps={WALKTHROUGH_STEPS} />
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Stand: {today()}</p>
      </div>

      <DashboardBanners
        data={{
          execEscalationOpenCount: execEscalationOpenFindings.length,
          eskalationFaelligCount: eskalationFaellig.length,
          gesamtGlFaelligCount: gesamtGlFaellig.length,
          qsOverdueCount: qsOverdueRows.length,
          lastQsDate: lastQs?.date ?? null,
          qsIntervallMonate,
          openAccessIncidentCount: openIncidents.length,
          kapazitaetOver,
          plannedDays,
          kapazitaet,
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Prüfungsplan-Abdeckung"
          value={coveragePct === null ? "—" : `${coveragePct}%`}
          hint={`${completedPlanned.length} von ${plannedThisYear.length} für ${currentYear} geplant abgeschlossen`}
          tone={coveragePct !== null && coveragePct < 70 ? "warn" : "neutral"}
        />
        <StatCard
          label="Überfällige Prüfungsobjekte"
          value={overdueUniv.length}
          hint={`von ${universum.length} im Prüfungsuniversum`}
          tone={overdueUniv.length ? "crit" : "good"}
        />
        <StatCard
          label="Offene wesentliche Mängel"
          value={wesentlicheOpen.length}
          hint="wesentlich / schwerwiegend / bes. schwerwiegend"
          tone={wesentlicheOpen.length ? "warn" : "good"}
        />
        <StatCard
          label="davon besonders schwerwiegend"
          value={besondersOpen.length}
          hint="Tz. 9 S.2 — sofortige Berichtspflicht"
          tone={besondersOpen.length ? "crit" : "good"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NextDueTable rows={upcoming} />
        <RecentActivity rows={auditLog.slice(0, 6)} />
      </div>
    </div>
  );
}
