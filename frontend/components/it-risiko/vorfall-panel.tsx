"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItVorfall, abschliessenItVorfall } from "@/app/(app)/it-risiko/actions";
import type { ItSicherheitsvorfall, ItVorfallSchweregrad } from "@/lib/regstack/it-risiko";

const STRIPE: Record<ItVorfallSchweregrad, string> = {
  gering: "bg-status-success", mittel: "bg-status-warning", hoch: "bg-status-danger", kritisch: "bg-status-danger",
};

function VorfallForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [schweregrad, setSchweregrad] = useState<ItVorfallSchweregrad>("mittel");
  const [beschreibung, setBeschreibung] = useState("");
  const [betroffeneSysteme, setBetroffeneSysteme] = useState("");
  const [meldepflichtBaFin, setMeldepflichtBaFin] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItVorfall({ datum, schweregrad, beschreibung, betroffeneSysteme, meldepflichtBaFin });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="date" value={datum} disabled={pending} onChange={(e) => setDatum(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={schweregrad} disabled={pending} onChange={(e) => setSchweregrad(e.target.value as ItVorfallSchweregrad)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="gering">gering</option><option value="mittel">mittel</option><option value="hoch">hoch</option><option value="kritisch">kritisch</option>
        </select>
        <textarea placeholder="Beschreibung" value={beschreibung} disabled={pending} rows={2} onChange={(e) => setBeschreibung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <input placeholder="Betroffene Systeme" value={betroffeneSysteme} disabled={pending} onChange={(e) => setBetroffeneSysteme(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
          <input type="checkbox" checked={meldepflichtBaFin} disabled={pending} onChange={(e) => setMeldepflichtBaFin(e.target.checked)} />
          Meldepflichtig gegenüber der BaFin
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !beschreibung.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function AbschliessenButton({ id }: { id: string }) {
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
              await abschliessenItVorfall(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Abschluss fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Schließt…" : "Abschließen"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function VorfallPanel({ items, canWrite }: { items: ItSicherheitsvorfall[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="vorfaelle">
      <CardHeader>
        <CardTitle>Sicherheitsvorfälle</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Vorfall</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">Erfassung, Eskalation und BaFin-Meldepflicht-Kennzeichnung (BAIT Kap. 4).</p>
        {adding && <div className="mb-3"><VorfallForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-2.5">
          {items.map((v) => (
            <div key={v.id} className="grid grid-cols-[4px_1fr_auto] items-stretch gap-3.5 overflow-hidden rounded-xl border border-border-subtle">
              <div className={STRIPE[v.schweregrad]} />
              <div className="py-3 pr-1">
                <div className="font-mono text-[11px] text-graphite-400">{v.datum.slice(0, 10)}</div>
                <div className="text-[13.5px] font-semibold text-foreground">{v.beschreibung}</div>
                {v.betroffeneSysteme && <div className="mt-0.5 text-xs text-muted-foreground">Betroffen: {v.betroffeneSysteme}</div>}
              </div>
              <div className="flex flex-col items-end justify-center gap-1.5 py-3 pr-4">
                <StatusPill status={v.schweregrad} />
                {v.meldepflichtBaFin && (
                  <StatusPill status="kritisch" label={`BaFin-meldepflichtig${v.meldedatumBaFin ? ` · gemeldet ${v.meldedatumBaFin.slice(0, 10)}` : ""}`} />
                )}
                <StatusPill status={v.status} />
                {canWrite && v.status !== "geschlossen" && <AbschliessenButton id={v.id} />}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Sicherheitsvorfälle erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
