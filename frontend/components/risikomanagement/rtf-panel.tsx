"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addRtfSnapshot, freigebenRtfSnapshot } from "@/app/(app)/risikomanagement/actions";
import type { Risikotragfaehigkeit, RtfAnsatz } from "@/lib/regstack/risikomanagement";
import { RISIKOART_LABELS } from "@/lib/regstack/risikomanagement-labels";

function barTone(pct: number) {
  if (pct >= 90) return "bg-status-danger";
  if (pct >= 70) return "bg-status-warning";
  return "bg-status-success";
}

function SnapshotForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [periode, setPeriode] = useState("");
  const [ansatz, setAnsatz] = useState<RtfAnsatz>("oekonomisch");
  const [rdp, setRdp] = useState("");
  const [auslastung, setAuslastung] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRtfSnapshot({
          periode,
          ansatz,
          risikodeckungspotenzial: rdp ? Number(rdp) : null,
          auslastungGesamt: auslastung ? Number(auslastung) : null,
          ergebnis,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Periode (z. B. 2026-Q2)" value={periode} disabled={pending} onChange={(e) => setPeriode(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={ansatz} disabled={pending} onChange={(e) => setAnsatz(e.target.value as RtfAnsatz)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="oekonomisch">ökonomisch</option>
          <option value="normativ">normativ</option>
        </select>
        <input type="number" placeholder="Risikodeckungspotenzial (€)" value={rdp} disabled={pending} onChange={(e) => setRdp(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input type="number" placeholder="Auslastung gesamt (%)" value={auslastung} disabled={pending} onChange={(e) => setAuslastung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <textarea placeholder="Ergebnis" value={ergebnis} disabled={pending} rows={2} onChange={(e) => setErgebnis(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !periode.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function FreigebenButton({ id }: { id: string }) {
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
              await freigebenRtfSnapshot(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Freigabe fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Gibt frei…" : "Freigeben"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function RtfPanel({ items, canWrite }: { items: Risikotragfaehigkeit[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const latest = items[0] ?? null;
  const limitEntries = latest ? (Object.entries(latest.limits) as [string, { auslastungProzent?: number }][]) : [];

  return (
    <Card id="rtf">
      <CardHeader>
        <CardTitle>Risikotragfähigkeit &amp; Limitauslastung</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Snapshot</Button>}
      </CardHeader>
      <CardBody>
        {adding && <div className="mb-3"><SnapshotForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {!latest ? (
          <p className="text-sm text-muted-foreground">Noch kein Risikotragfähigkeits-Snapshot erfasst.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Periode <span className="font-medium text-foreground">{latest.periode}</span> · {latest.ansatz === "oekonomisch" ? "ökonomische" : "normative"} Perspektive
                {latest.risikodeckungspotenzial != null && <> · RDP {(latest.risikodeckungspotenzial / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €</>}
              </span>
              {canWrite && !latest.freigegebenAm && <FreigebenButton id={latest.id} />}
              {latest.freigegebenAm && <span className="text-status-success">Freigegeben {latest.freigegebenAm.slice(0, 10)}</span>}
            </div>
            <div className="flex flex-col gap-3">
              {limitEntries.map(([kategorie, limit]) => {
                const pct = limit.auslastungProzent ?? 0;
                return (
                  <div key={kategorie} className="grid grid-cols-[190px_1fr_46px] items-center gap-3">
                    <div className="text-xs text-graphite-200">{RISIKOART_LABELS[kategorie as keyof typeof RISIKOART_LABELS] ?? kategorie}</div>
                    <div className="h-2 overflow-hidden rounded-full bg-graphite-800">
                      <div className={`h-full rounded-full ${barTone(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-right font-mono text-xs text-graphite-300">{pct}&nbsp;%</div>
                  </div>
                );
              })}
              {limitEntries.length === 0 && <p className="text-xs text-muted-foreground">Keine Limits im Snapshot hinterlegt.</p>}
            </div>
            {latest.ergebnis && <p className="mt-3 text-xs text-muted-foreground">{latest.ergebnis}</p>}
          </>
        )}
      </CardBody>
    </Card>
  );
}
