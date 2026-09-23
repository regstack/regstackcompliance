"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmReport, updateRmReport, finalizeRmReport, acknowledgeRmReport } from "@/app/(app)/risikomanagement/actions";
import type { RmReport, RmReportEmpfaenger } from "@/lib/regstack/risikomanagement";

const EMPFAENGER_LABELS: Record<RmReportEmpfaenger, string> = {
  geschaeftsleitung: "Geschäftsleitung",
  aufsichtsorgan: "Aufsichtsorgan (AT 3.2)",
};

function ActionButton({ label, pendingLabel, onRun }: { label: string; pendingLabel: string; onRun: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        className="px-2.5 py-1 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await onRun();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

function ReportForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [reportType, setReportType] = useState("quartalsbericht");
  const [empfaenger, setEmpfaenger] = useState<RmReportEmpfaenger>("geschaeftsleitung");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRmReport(reportType, empfaenger, periodFrom, periodTo);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <select value={reportType} disabled={pending} onChange={(e) => setReportType(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="quartalsbericht">Quartalsbericht</option>
          <option value="jahresbericht">Jahresbericht</option>
          <option value="anlassbericht">Anlassbericht</option>
        </select>
        <select value={empfaenger} disabled={pending} onChange={(e) => setEmpfaenger(e.target.value as RmReportEmpfaenger)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(EMPFAENGER_LABELS) as RmReportEmpfaenger[]).map((e) => <option key={e} value={e}>{EMPFAENGER_LABELS[e]}</option>)}
        </select>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Von
          <input type="date" value={periodFrom} disabled={pending} onChange={(e) => setPeriodFrom(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Bis
          <input type="date" value={periodTo} disabled={pending} onChange={(e) => setPeriodTo(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Als Entwurf anlegen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// Nur reportType/empfaenger/Zeitraum sind editierbar — das `content`-JSON hat noch keinen eigenen
// Editor, analog zu updateRisikostrategie/updateItStrategie.
function ReportEditForm({ report, onDone, onCancel }: { report: RmReport; onDone: () => void; onCancel: () => void }) {
  const [reportType, setReportType] = useState(report.reportType);
  const [empfaenger, setEmpfaenger] = useState<RmReportEmpfaenger>(report.empfaenger);
  const [periodFrom, setPeriodFrom] = useState(report.periodFrom?.slice(0, 10) ?? "");
  const [periodTo, setPeriodTo] = useState(report.periodTo?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateRmReport(report.id, reportType, empfaenger, periodFrom, periodTo);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <select value={reportType} disabled={pending} onChange={(e) => setReportType(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="quartalsbericht">Quartalsbericht</option>
          <option value="jahresbericht">Jahresbericht</option>
          <option value="anlassbericht">Anlassbericht</option>
        </select>
        <select value={empfaenger} disabled={pending} onChange={(e) => setEmpfaenger(e.target.value as RmReportEmpfaenger)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(EMPFAENGER_LABELS) as RmReportEmpfaenger[]).map((e) => <option key={e} value={e}>{EMPFAENGER_LABELS[e]}</option>)}
        </select>
        <input type="date" value={periodFrom} disabled={pending} onChange={(e) => setPeriodFrom(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input type="date" value={periodTo} disabled={pending} onChange={(e) => setPeriodTo(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function ReportPanel({
  reports, canWrite, canAcknowledge, currentUserId,
}: {
  reports: RmReport[];
  canWrite: boolean;
  canAcknowledge: boolean;
  currentUserId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="bericht">
      <CardHeader>
        <CardTitle>Berichtswesen</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Bericht</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          GL-Bericht (AT 4.3.2 Tz. 3) und mindestens vierteljährliches Aufsichtsorgan-Reporting
          (AT 3.2) — gleiches Modell, unterschiedlicher Empfänger.
        </p>
        {adding && <div className="mb-3"><ReportForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch kein Bericht erfasst.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((r) => {
              const acknowledged = r.acknowledgements.some((a) => a.userId === currentUserId);
              return (
                <div key={r.id} className="rounded-lg border border-border-subtle p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground capitalize">{r.reportType}</span>
                      <StatusPill status={r.empfaenger === "aufsichtsorgan" ? "wesentlich" : "aktiv"} label={EMPFAENGER_LABELS[r.empfaenger]} />
                      {r.periodFrom && r.periodTo && (
                        <span className="text-xs text-muted-foreground">{r.periodFrom.slice(0, 10)} – {r.periodTo.slice(0, 10)}</span>
                      )}
                      <StatusPill status={r.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      {canWrite && r.status === "entwurf" && editingId !== r.id && (
                        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditingId(r.id)}>Bearbeiten</Button>
                      )}
                      {canWrite && r.status === "entwurf" && (
                        <ActionButton label="Finalisieren" pendingLabel="Finalisiert…" onRun={() => finalizeRmReport(r.id)} />
                      )}
                      {canAcknowledge && r.status === "final" && !acknowledged && (
                        <ActionButton label="Kenntnisnahme" pendingLabel="Speichert…" onRun={() => acknowledgeRmReport(r.id)} />
                      )}
                      {acknowledged && <span className="text-xs text-status-success">Zur Kenntnis genommen</span>}
                    </div>
                  </div>
                  {editingId === r.id && (
                    <ReportEditForm report={r} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                  )}
                  {Object.keys(r.content).length > 0 && (
                    <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                      {([
                        ["kapitalausstattung", "Kapitalausstattung / RTF"],
                        ["risikolage", "Risikolage"],
                        ["massnahmen", "Maßnahmen"],
                        ["geschaeftslage", "Geschäftslage"],
                        ["risikosituation", "Risikosituation"],
                        ["strategienUndAnpassungen", "Strategien inkl. Anpassungen"],
                        ["complianceBericht", "Compliance-Bericht"],
                        ["revisionsberichte", "Revisionsberichte"],
                      ] as const).map(([key, label]) =>
                        r.content[key] ? (
                          <div key={key}>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite-500">{label}</div>
                            <p className="leading-relaxed text-foreground">{r.content[key]}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
