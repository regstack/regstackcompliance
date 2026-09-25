"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { severityLabel } from "@/lib/regstack/revisions-utils";
import {
  generateQuartalsbericht, updateQuartalsberichtPlanAdherence, finalizeQuartalsbericht, ackQuartalsbericht,
  type ResolvedQuartalAudit, type ResolvedQuartalCarryover,
} from "@/app/(app)/interne-revision/quartalsbericht/actions";

type Report = {
  id: string;
  status: string;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
  kenntnisnahme_at: string | null;
  kenntnisnahme_by: string | null;
  kenntnisnehmer: { full_name: string } | null;
  planAdherence: string;
  frozen: boolean;
  audits: ResolvedQuartalAudit[];
  carryover: ResolvedQuartalCarryover[];
};

const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

function ReportCard({ r, canWrite, canAck }: { r: Report; canWrite: boolean; canAck: boolean }) {
  const [planAdherence, setPlanAdherence] = useState(r.planAdherence);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const besonders = [
    ...r.audits.flatMap((a) => a.findings.filter((f) => f.schweregrad === "besonders_schwerwiegend")),
    ...r.carryover.filter((f) => f.schweregrad === "besonders_schwerwiegend"),
  ];

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

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{r.period_from} – {r.period_to}</h3>
          <div className="flex items-center gap-2">
            {r.frozen && <StatusPill status="entwurf" label="eingefroren" />}
            <StatusPill status={r.status === "final" ? "final" : "entwurf"} label={r.status === "final" ? "final" : "Entwurf"} />
            <a href={`/interne-revision/quartalsbericht/${r.id}/pdf`} className="text-xs text-copper-300 hover:underline">
              PDF herunterladen
            </a>
          </div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Erstellt am {r.created_at?.slice(0, 10)}</p>

        {besonders.length > 0 && (
          <div className="mb-3 rounded-md border border-status-danger/30 bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
            <strong>Besonders schwerwiegende Mängel im Berichtszeitraum</strong> — nach Tz. 9 S.2
            bereits unverzüglich berichtet; hier nur zur vollständigen Dokumentation:{" "}
            {besonders.map((f) => f.titel).join("; ")}
          </div>
        )}

        <h4 className="mb-1.5 mt-3 text-xs font-semibold text-foreground">Im Berichtsquartal durchgeführte Prüfungen</h4>
        {r.audits.length > 0 ? (
          <div className="space-y-2">
            {r.audits.map((a) => (
              <div key={a.id} className="rounded-md border border-border-subtle p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{a.subject}</span>
                  <span className="text-muted-foreground">Bericht vom {a.reportDate ?? "–"}{a.presentedTo ? ` · vorgelegt an ${a.presentedTo}` : ""}</span>
                </div>
                {a.findings.length > 0 ? (
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {a.findings.map((f) => (
                        <tr key={f.id} className="border-t border-border-subtle/50">
                          <td className="py-1 pr-2 text-foreground">{f.titel}</td>
                          <td className="py-1 pr-2">{f.schweregrad && <StatusPill status={f.schweregrad} label={severityLabel(f.schweregrad)} />}</td>
                          <td className="py-1"><StatusPill status={f.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">Keine Feststellungen.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Im Berichtsquartal wurde keine Prüfung abgeschlossen.</p>
        )}

        <h4 className="mb-1.5 mt-4 text-xs font-semibold text-foreground">Noch nicht behobene wesentliche Mängel aus anderen Berichtsquartalen</h4>
        {r.carryover.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Prüfung</th>
                <th className="py-1 pr-2 font-medium">Feststellung</th>
                <th className="py-1 pr-2 font-medium">Schweregrad</th>
                <th className="py-1 font-medium">Status</th>
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
          <p className="text-xs text-muted-foreground">Keine offenen Altbestände.</p>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-foreground">
            Beurteilung der (voraussichtlichen) Einhaltung des Prüfungsplans
          </label>
          <textarea
            rows={2}
            value={planAdherence}
            disabled={r.frozen || !canWrite}
            onChange={(e) => setPlanAdherence(e.target.value)}
            aria-label="Beurteilung der (voraussichtlichen) Einhaltung des Prüfungsplans"
            className={`w-full ${input}`}
          />
          {!r.frozen && canWrite && (
            <Button
              variant="secondary"
              className="mt-1.5 px-2 py-1 text-[11px]"
              disabled={pending}
              onClick={() => run(() => updateQuartalsberichtPlanAdherence(r.id, planAdherence))}
            >
              Speichern
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          {r.status === "entwurf" && canWrite && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => finalizeQuartalsbericht(r.id))}>
              Finalisieren und einfrieren
            </Button>
          )}
          {r.status === "final" && !r.kenntnisnahme_at && canAck && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => ackQuartalsbericht(r.id))}>
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

export function QuartalsberichtPanel({
  reports, canWrite, canAck, defaultYear, defaultQuarter,
}: {
  reports: Report[];
  canWrite: boolean;
  canAck: boolean;
  defaultYear: number;
  defaultQuarter: number;
}) {
  const [year, setYear] = useState(defaultYear);
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        await generateQuartalsbericht(year, quarter);
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
            {[defaultYear - 1, defaultYear].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} aria-label="Quartal" className={input}>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
          <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={create}>
            + Quartalsbericht erstellen
          </Button>
          {error && <p className="text-xs text-status-danger">{error}</p>}
        </div>
      )}

      {reports.length > 0 ? (
        reports.map((r) => <ReportCard key={r.id} r={r} canWrite={canWrite} canAck={canAck} />)
      ) : (
        <Card><CardBody><p className="text-sm text-muted-foreground">Noch kein Quartalsbericht erfasst.</p></CardBody></Card>
      )}
    </div>
  );
}
