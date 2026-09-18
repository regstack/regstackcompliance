"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveHandlungsoption, approveHandlungsoption } from "@/app/(app)/outsourcing/actions";
import { HANDLUNGSOPTION_OPTS, ERSETZBARKEIT_OPTS, type Handlungsoption } from "@/lib/regstack/classification";

export function HandlungsoptionPanel({
  auslagerungId, initial, canWrite, canApprove,
}: {
  auslagerungId: string;
  initial: Handlungsoption;
  canWrite: boolean;
  /** Dependency-Acceptance-Bestätigung (Tz. 6 S.3) — Geschäftsleitung/Admin only, independent of
   * canWrite: someone who can write the rest of this record may not hold this specific step, and
   * a Geschäftsleitung user holds only this step, not general write access to the record. */
  canApprove: boolean;
}) {
  const [h, setH] = useState<Handlungsoption>(initial);
  const [dirty, setDirty] = useState(false);
  const [approverDirty, setApproverDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [approvePending, startApproveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  function update(patch: Partial<Handlungsoption>) {
    setH((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function updateApprover(patch: Partial<Handlungsoption>) {
    setH((prev) => ({ ...prev, ...patch }));
    setApproverDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await saveHandlungsoption(auslagerungId, h);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function approve() {
    setApproveError(null);
    startApproveTransition(async () => {
      try {
        await approveHandlungsoption(auslagerungId, h.depApprover);
        setApproverDirty(false);
      } catch (e) {
        setApproveError(e instanceof Error ? e.message : "Genehmigung fehlgeschlagen.");
      }
    });
  }

  const disabled = !canWrite || pending;
  const approveDisabled = !canApprove || approvePending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Handlungsoptionen / Ausstiegsstrategie (Tz. 6)</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Bei unbeabsichtigter Beendigung muss das Institut Handlungsoptionen prüfen und verabschieden — irgendeine der drei Optionen muss dokumentiert sein.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {HANDLUNGSOPTION_OPTS.map((opt) => (
              <button
                key={opt.v}
                type="button"
                disabled={disabled}
                onClick={() => update({ status: opt.v })}
                className={`rounded-lg border-2 p-3.5 text-left text-sm transition-colors disabled:opacity-50 ${
                  h.status === opt.v ? "border-copper-500 bg-copper-500/10" : "border-border-subtle bg-graphite-900/60 hover:border-border-strong"
                }`}
              >
                <div className="font-medium text-foreground">{opt.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            ))}
          </div>

          {h.status === "adopted_options" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alternative / Transitionspfad
                <input value={h.altProvider} disabled={disabled} onChange={(e) => update({ altProvider: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Geschätzte Übergangsdauer (Monate)
                <input type="number" value={h.altTransition} disabled={disabled} onChange={(e) => update({ altTransition: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
              </label>
            </div>
          )}

          {h.status === "exit_strategy" && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ausstiegsstrategie (Beschreibung)
                <textarea value={h.strategyDescription} disabled={disabled} rows={3}
                  placeholder="Transitionsplan, Verantwortlichkeiten, Meilensteine..."
                  onChange={(e) => update({ strategyDescription: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Letzter Test / Übung
                <input type="date" value={h.testDate} disabled={disabled} onChange={(e) => update({ testDate: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
              </label>
            </div>
          )}

          {h.status === "bcm_linked" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Akzeptiert durch (Geschäftsleitung)
                  <input value={h.depApprover} disabled={approveDisabled} onChange={(e) => updateApprover({ depApprover: e.target.value })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Datum
                  <input type="date" value={h.depDate} disabled className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground opacity-50" />
                </label>
              </div>
              {canApprove && (
                <div className="flex items-center gap-3">
                  <Button onClick={approve} disabled={!h.depApprover || approveDisabled}>
                    {approvePending ? "Genehmigt…" : "Dependency-Acceptance genehmigen"}
                  </Button>
                  {approverDirty && !approvePending && <span className="text-xs text-status-warning">Noch nicht genehmigt</span>}
                  {approveError && <span className="text-xs text-status-danger">{approveError}</span>}
                </div>
              )}
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verknüpfung zur Notfallplanung / kompensierende Kontrollen
                <textarea value={h.depControls} disabled={disabled} rows={3}
                  placeholder="Verweis auf BCM-Szenario, vertragliche Absicherung..."
                  onChange={(e) => update({ depControls: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
              </label>
            </div>
          )}

          {!h.status && <p className="rounded-md bg-graphite-900/60 px-3 py-2 text-xs text-muted-foreground">Bitte eine der drei Optionen wählen.</p>}

          <div className="grid gap-3 sm:grid-cols-3 border-t border-border-subtle pt-4">
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ersetzbarkeit
              <select value={h.ersetzbarkeit} disabled={disabled} onChange={(e) => update({ ersetzbarkeit: e.target.value as Handlungsoption["ersetzbarkeit"] })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50">
                {ERSETZBARKEIT_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Übergangsdauer i. M.
              <input type="number" value={h.transitionMonths} disabled={disabled}
                onChange={(e) => update({ transitionMonths: Number(e.target.value) })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nächste Überprüfung
              <input type="date" value={h.reviewDate} disabled={disabled} onChange={(e) => update({ reviewDate: e.target.value })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
            </label>
          </div>
        </CardBody>
      </Card>

      {canWrite && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || pending}>{pending ? "Speichert…" : "Handlungsoption speichern"}</Button>
          {dirty && !pending && <span className="text-xs text-status-warning">Ungespeicherte Änderungen</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
