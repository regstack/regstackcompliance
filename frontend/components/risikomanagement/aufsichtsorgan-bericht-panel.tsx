"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addAufsichtsorganBericht,
  finalizeAufsichtsorganBericht,
  markAufsichtsorganBerichtSent,
} from "@/app/(app)/risikomanagement/actions";
import type { AufsichtsorganBericht } from "@/lib/regstack/risikomanagement";

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

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

function BerichtForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [geschaeftslage, setGeschaeftslage] = useState("");
  const [risikosituation, setRisikosituation] = useState("");
  const [strategien, setStrategien] = useState("");
  const [complianceBericht, setComplianceBericht] = useState("");
  const [revisionsberichte, setRevisionsberichte] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addAufsichtsorganBericht({ periodFrom, periodTo, geschaeftslage, risikosituation, strategien, complianceBericht, revisionsberichte });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Von
          <input type="date" value={periodFrom} disabled={pending} onChange={(e) => setPeriodFrom(e.target.value)} className={`normal-case ${inputCls}`} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Bis
          <input type="date" value={periodTo} disabled={pending} onChange={(e) => setPeriodTo(e.target.value)} className={`normal-case ${inputCls}`} />
        </label>
      </div>
      <textarea placeholder="Geschäftslage" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={geschaeftslage} onChange={(e) => setGeschaeftslage(e.target.value)} />
      <textarea placeholder="Risikosituation" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={risikosituation} onChange={(e) => setRisikosituation(e.target.value)} />
      <textarea placeholder="Strategien inkl. Anpassungen" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={strategien} onChange={(e) => setStrategien(e.target.value)} />
      <textarea placeholder="Compliance-Bericht" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={complianceBericht} onChange={(e) => setComplianceBericht(e.target.value)} />
      <textarea placeholder="Revisionsberichte" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={revisionsberichte} onChange={(e) => setRevisionsberichte(e.target.value)} />
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Als Entwurf anlegen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

const CONTENT_FIELDS: { key: keyof AufsichtsorganBericht["content"]; label: string }[] = [
  { key: "geschaeftslage", label: "Geschäftslage" },
  { key: "risikosituation", label: "Risikosituation" },
  { key: "strategien", label: "Strategien inkl. Anpassungen" },
  { key: "complianceBericht", label: "Compliance-Bericht" },
  { key: "revisionsberichte", label: "Revisionsberichte" },
];

export function AufsichtsorganBerichtPanel({ berichte, canWrite }: { berichte: AufsichtsorganBericht[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="aufsichtsorgan-bericht">
      <CardHeader>
        <CardTitle>Bericht an das Aufsichtsorgan (AT 3.2)</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Bericht</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Mindestens vierteljährliches Reporting in Textform an das Aufsichtsorgan — eigenständig vom
          internen Bericht an die Geschäftsleitung oben.
        </p>
        {adding && <div className="mb-3"><BerichtForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {berichte.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch kein Bericht erfasst.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {berichte.map((b) => (
              <div key={b.id} className="rounded-lg border border-border-subtle p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {b.periodFrom && b.periodTo && (
                      <span className="text-xs text-muted-foreground">{b.periodFrom.slice(0, 10)} – {b.periodTo.slice(0, 10)}</span>
                    )}
                    <StatusPill status={b.status} />
                    {b.versendetAm && <span className="text-xs text-status-success">Versendet am {b.versendetAm.slice(0, 10)}</span>}
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2">
                      {b.status === "entwurf" && (
                        <ActionButton label="Finalisieren" pendingLabel="Finalisiert…" onRun={() => finalizeAufsichtsorganBericht(b.id)} />
                      )}
                      {b.status === "final" && (
                        <ActionButton label="Als versendet markieren" pendingLabel="Speichert…" onRun={() => markAufsichtsorganBerichtSent(b.id)} />
                      )}
                    </div>
                  )}
                </div>
                {CONTENT_FIELDS.some(({ key }) => b.content[key]) && (
                  <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                    {CONTENT_FIELDS.filter(({ key }) => b.content[key]).map(({ key, label }) => (
                      <div key={key}>
                        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite-500">{label}</div>
                        <p className="leading-relaxed text-foreground">{b.content[key]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
