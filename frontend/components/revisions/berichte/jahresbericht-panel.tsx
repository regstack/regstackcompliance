"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { SEVERITY_ORDER, severityLabel, ratingMeta, UNIV_STATUS_LABEL } from "@/lib/regstack/revisions-utils";
import {
  generateJahresbericht, updateJahresberichtText, finalizeJahresbericht, ackJahresbericht,
  type ResolvedJahrCarryover, type ResolvedJahrPlanItem,
} from "@/app/(app)/interne-revision/jahresbericht/actions";

type Audit = {
  id: string; subject: string; reportDate: string | null; pruefungsobjektId: string;
  findings: { id: string; titel: string; schweregrad: string | null; status: string }[];
  overallRating: string | null; budgetDays: number; actualDays: number; durchfuehrung: string;
};
type Coverage = { id: string; name: string; outsourced: boolean; cycle: number; next: string; status: "never" | "overdue" | "due_soon" | "on_time" };
type Report = {
  id: string; status: string; period_from: string | null; period_to: string | null; created_at: string;
  kenntnisnahme_at: string | null; kenntnisnahme_by: string | null; kenntnisnehmer: { full_name: string } | null;
  year: number; planAdherence: string; gesamtaussage: string; frozen: boolean;
  audits: Audit[]; carryover: ResolvedJahrCarryover[]; plan: ResolvedJahrPlanItem[];
  profile: Record<string, { gesamt: number; offen: number }>;
};

const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

function ReportCard({ r, coverage, canWrite, canAck }: { r: Report; coverage: Coverage[]; canWrite: boolean; canAck: boolean }) {
  const [planAdherence, setPlanAdherence] = useState(r.planAdherence);
  const [gesamtaussage, setGesamtaussage] = useState(r.gesamtaussage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  const plannedDone = r.plan.filter((p) => p.erledigt).length;
  const budgetSum = r.audits.reduce((s, a) => s + (a.budgetDays || 0), 0);
  const actualSum = r.audits.reduce((s, a) => s + (a.actualDays || 0), 0);
  const covOverdue = coverage.filter((c) => c.status === "overdue" || c.status === "never");

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Jahresbericht {r.year}</h3>
          <div className="flex items-center gap-2">
            {r.frozen && <StatusPill status="entwurf" label="eingefroren" />}
            <StatusPill status={r.status === "final" ? "final" : "entwurf"} label={r.status === "final" ? "final" : "Entwurf"} />
          </div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Erstellt am {r.created_at?.slice(0, 10)}</p>

        <h4 className="mb-2 text-xs font-semibold text-foreground">1 · Plan-Ist-Vergleich</h4>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Geplante Objekte" value={r.plan.length} />
          <StatCard label="Davon geprüft" value={plannedDone} tone={plannedDone < r.plan.length ? "warn" : "good"} />
          <StatCard label="Prüfungen gesamt" value={r.audits.length} />
          <StatCard label="Aufwand Ist / Budget" value={`${actualSum} / ${budgetSum}`} />
        </div>
        {r.plan.length > plannedDone && (
          <div className="mb-3 rounded-md border border-status-warning/30 bg-status-warning-bg px-3 py-2 text-xs text-status-warning">
            Nicht abgearbeitete Planobjekte: {r.plan.filter((p) => !p.erledigt).map((p) => p.bezeichnung).join(" · ")}
          </div>
        )}

        <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">2 · Durchgeführte Prüfungen und Gesamturteile</h4>
        {r.audits.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Prüfung</th><th className="py-1 pr-2 font-medium">Bericht</th>
                <th className="py-1 pr-2 font-medium">Durchführung</th><th className="py-1 pr-2 font-medium">Gesamturteil</th>
                <th className="py-1 pr-2 font-medium">Feststellungen</th><th className="py-1 font-medium">PT Ist/Budget</th>
              </tr>
            </thead>
            <tbody>
              {r.audits.map((a) => {
                const rating = ratingMeta(a.overallRating);
                return (
                  <tr key={a.id} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-1 pr-2 text-foreground">{a.subject}</td>
                    <td className="py-1 pr-2 font-mono">{a.reportDate ?? "–"}</td>
                    <td className="py-1 pr-2">{a.durchfuehrung === "ausgelagert" ? "ausgelagert" : a.durchfuehrung === "gemischt" ? "gemischt" : "intern"}</td>
                    <td className="py-1 pr-2"><StatusPill status={a.overallRating || "offen"} label={rating.l} /></td>
                    <td className="py-1 pr-2 text-center">{a.findings.length}</td>
                    <td className="py-1">{a.actualDays || 0} / {a.budgetDays || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">Im Geschäftsjahr wurde keine Prüfung abgeschlossen.</p>
        )}

        <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">3 · Feststellungen nach Schweregrad</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-1 pr-2 font-medium">Schweregrad</th><th className="py-1 pr-2 font-medium">Gesamt</th>
              <th className="py-1 pr-2 font-medium">Davon offen</th><th className="py-1 font-medium">Erledigungsquote</th>
            </tr>
          </thead>
          <tbody>
            {SEVERITY_ORDER.map((k) => {
              const p = r.profile[k] ?? { gesamt: 0, offen: 0 };
              const quote = p.gesamt ? Math.round((100 * (p.gesamt - p.offen)) / p.gesamt) : 100;
              return (
                <tr key={k} className="border-b border-border-subtle/50 last:border-0">
                  <td className="py-1 pr-2"><StatusPill status={k} label={severityLabel(k)} /></td>
                  <td className="py-1 pr-2">{p.gesamt}</td>
                  <td className="py-1 pr-2">{p.offen}</td>
                  <td className="py-1">{quote} %</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">4 · Noch nicht behobene wesentliche Mängel aus Vorjahren</h4>
        {r.carryover.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Prüfung</th><th className="py-1 pr-2 font-medium">Feststellung</th>
                <th className="py-1 pr-2 font-medium">Schweregrad</th><th className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {r.carryover.map((f) => (
                <tr key={f.feststellungId} className="border-b border-border-subtle/50 last:border-0">
                  <td className="py-1 pr-2">{f.subject}</td>
                  <td className="py-1 pr-2 text-foreground">{f.titel}</td>
                  <td className="py-1 pr-2">{f.schweregrad && <StatusPill status={f.schweregrad} label={severityLabel(f.schweregrad)} />}</td>
                  <td className="py-1"><StatusPill status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">Keine offenen Altbestände aus Vorjahren.</p>
        )}

        <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">5 · Abdeckung des Prüfungsuniversums</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-1 pr-2 font-medium">Prüfungsobjekt</th><th className="py-1 pr-2 font-medium">Zyklus</th>
              <th className="py-1 pr-2 font-medium">Nächste Prüfung</th><th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => (
              <tr key={c.id} className="border-b border-border-subtle/50 last:border-0">
                <td className="py-1 pr-2 text-foreground">{c.name}{c.outsourced ? " (ausgelagert)" : ""}</td>
                <td className="py-1 pr-2">{c.cycle} J.</td>
                <td className="py-1 pr-2 font-mono">{c.next}</td>
                <td className="py-1"><StatusPill status={c.status} label={UNIV_STATUS_LABEL[c.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {covOverdue.length > 0 && (
          <div className="mt-2 rounded-md border border-status-warning/30 bg-status-warning-bg px-3 py-2 text-xs text-status-warning">
            {covOverdue.length} Prüfungsobjekt(e) außerhalb des Turnus — im Jahresbericht ist zu
            erläutern, warum die Prüfung nicht innerhalb des abgeleiteten Zyklus erfolgt ist.
          </div>
        )}

        <h4 className="mb-2 mt-4 text-xs font-semibold text-foreground">6 · Beurteilung und Gesamtaussage</h4>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Beurteilung der Einhaltung des Prüfungsplans</label>
            <textarea rows={2} value={planAdherence} disabled={r.frozen || !canWrite} onChange={(e) => setPlanAdherence(e.target.value)} aria-label="Beurteilung der Einhaltung des Prüfungsplans" className={`w-full ${input}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Gesamtaussage zur Funktionsfähigkeit der Internen Revision</label>
            <textarea rows={2} value={gesamtaussage} disabled={r.frozen || !canWrite} onChange={(e) => setGesamtaussage(e.target.value)} aria-label="Gesamtaussage zur Funktionsfähigkeit der Internen Revision" className={`w-full ${input}`} />
          </div>
          {!r.frozen && canWrite && (
            <Button
              variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending}
              onClick={() => run(() => updateJahresberichtText(r.id, { planAdherence, gesamtaussage }))}
            >
              Speichern
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          {r.status === "entwurf" && canWrite && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => finalizeJahresbericht(r.id))}>
              Finalisieren und einfrieren
            </Button>
          )}
          {r.status === "final" && !r.kenntnisnahme_at && canAck && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => ackJahresbericht(r.id))}>
              Kenntnisnahme (Geschäftsleitung)
            </Button>
          )}
          {r.kenntnisnahme_at && (
            <span className="text-xs text-status-success">
              Kenntnisnahme durch {r.kenntnisnehmer?.full_name ?? "Geschäftsleitung"} am {r.kenntnisnahme_at}
            </span>
          )}
          {r.status === "final" && (
            <span className="text-[11px] text-muted-foreground">
              Der Bericht ist eingefroren — Inhalte zeigen den Stand der Vorlage und ändern sich nicht mehr.
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}

export function JahresberichtPanel({
  reports, coverage, canWrite, canAck, defaultYear, yearOptions,
}: {
  reports: Report[];
  coverage: Coverage[];
  canWrite: boolean;
  canAck: boolean;
  defaultYear: number;
  yearOptions: number[];
}) {
  const [year, setYear] = useState(defaultYear);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        await generateJahresbericht(year);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erstellen fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      {canWrite && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Jahr" className={input}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={create}>
            + Jahresbericht erstellen
          </Button>
          {error && <p className="text-xs text-status-danger">{error}</p>}
        </div>
      )}

      {reports.length > 0 ? (
        [...reports].sort((a, b) => b.year - a.year).map((r) => (
          <ReportCard key={r.id} r={r} coverage={coverage} canWrite={canWrite} canAck={canAck} />
        ))
      ) : (
        <Card><CardBody><p className="text-sm text-muted-foreground">Noch kein Jahresbericht erfasst.</p></CardBody></Card>
      )}
    </div>
  );
}
