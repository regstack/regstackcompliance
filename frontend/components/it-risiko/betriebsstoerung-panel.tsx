"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItBetriebsstoerung, updateItBetriebsstoerung, abschliessenItBetriebsstoerung } from "@/app/(app)/it-risiko/actions";
import type { ItBetriebsstoerung, ItStoerungPrioritaet } from "@/lib/regstack/it-risiko";

const STRIPE: Record<ItStoerungPrioritaet, string> = {
  niedrig: "bg-status-success", mittel: "bg-status-warning", hoch: "bg-status-danger", kritisch: "bg-status-danger",
};

function StoerungForm({ initial, onDone, onCancel }: { initial?: ItBetriebsstoerung; onDone: () => void; onCancel: () => void }) {
  const [datum, setDatum] = useState((initial?.datum ?? new Date().toISOString()).slice(0, 10));
  const [beschreibung, setBeschreibung] = useState(initial?.beschreibung ?? "");
  const [betroffeneSysteme, setBetroffeneSysteme] = useState(initial?.betroffeneSysteme ?? "");
  const [ursache, setUrsache] = useState(initial?.ursache ?? "");
  const [prioritaet, setPrioritaet] = useState<ItStoerungPrioritaet>(initial?.prioritaet ?? "mittel");
  const [geschaeftsleitungInformiert, setGeschaeftsleitungInformiert] = useState(initial?.geschaeftsleitungInformiert ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) {
          await updateItBetriebsstoerung(initial.id, { beschreibung, betroffeneSysteme, ursache, prioritaet, geschaeftsleitungInformiert });
        } else {
          await addItBetriebsstoerung({ datum, beschreibung, betroffeneSysteme, ursache, prioritaet, geschaeftsleitungInformiert });
        }
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="date" value={datum} disabled={pending || !!initial} onChange={(e) => setDatum(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={prioritaet} disabled={pending} onChange={(e) => setPrioritaet(e.target.value as ItStoerungPrioritaet)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="niedrig">niedrig</option><option value="mittel">mittel</option><option value="hoch">hoch</option><option value="kritisch">kritisch</option>
        </select>
        <textarea placeholder="Beschreibung" value={beschreibung} disabled={pending} rows={2} onChange={(e) => setBeschreibung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <input placeholder="Betroffene Systeme" value={betroffeneSysteme} disabled={pending} onChange={(e) => setBetroffeneSysteme(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Ursache" value={ursache} disabled={pending} onChange={(e) => setUrsache(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
          <input type="checkbox" checked={geschaeftsleitungInformiert} disabled={pending} onChange={(e) => setGeschaeftsleitungInformiert(e.target.checked)} />
          Geschäftsleitung informiert
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !beschreibung.trim()} onClick={submit}>
          {pending ? "Speichert…" : initial ? "Änderungen speichern" : "Speichern"}
        </Button>
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
              await abschliessenItBetriebsstoerung(id);
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

export function BetriebsstoerungPanel({ items, canWrite }: { items: ItBetriebsstoerung[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="betriebsstoerungen">
      <CardHeader>
        <CardTitle>Betriebsstörungen</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => { setEditingId(null); setAdding(true); }}>+ Störung</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Ungeplante Abweichungen vom Regelbetrieb — bewusst getrennt von Sicherheitsvorfällen (BAIT Kap. 8, Tz. 8.6).
        </p>
        {adding && <div className="mb-3"><StoerungForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-2.5">
          {items.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-xl border border-border-subtle">
              <div className="grid grid-cols-[4px_1fr_auto] items-stretch gap-3.5">
                <div className={STRIPE[s.prioritaet]} />
                <div className="py-3 pr-1">
                  <div className="font-mono text-[11px] text-graphite-400">{s.datum.slice(0, 10)}</div>
                  <div className="text-[13.5px] font-semibold text-foreground">{s.beschreibung}</div>
                  {s.betroffeneSysteme && <div className="mt-0.5 text-xs text-muted-foreground">Betroffen: {s.betroffeneSysteme}</div>}
                </div>
                <div className="flex flex-col items-end justify-center gap-1.5 py-3 pr-4">
                  <StatusPill status={s.prioritaet} />
                  {s.geschaeftsleitungInformiert && <StatusPill status="hoch" label="GL informiert" />}
                  <StatusPill status={s.status} />
                  <div className="flex gap-1.5">
                    {canWrite && (
                      <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={adding} onClick={() => { setAdding(false); setEditingId(editingId === s.id ? null : s.id); }}>
                        Bearbeiten
                      </Button>
                    )}
                    {canWrite && s.status !== "geschlossen" && <AbschliessenButton id={s.id} />}
                  </div>
                </div>
              </div>
              {editingId === s.id && (
                <div className="border-t border-border-subtle p-3"><StoerungForm initial={s} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} /></div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Betriebsstörungen erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
