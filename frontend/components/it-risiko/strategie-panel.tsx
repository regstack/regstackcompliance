"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItStrategie, verabschiedeItStrategie } from "@/app/(app)/it-risiko/actions";
import type { ItStrategie } from "@/lib/regstack/it-risiko";

function StrategieForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [konsistenz, setKonsistenz] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItStrategie(jahr, konsistenz);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="number" placeholder="Jahr" value={jahr} disabled={pending} onChange={(e) => setJahr(Number(e.target.value))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Konsistenzprüfung zur Geschäftsstrategie" value={konsistenz} disabled={pending}
          onChange={(e) => setKonsistenz(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Als Entwurf anlegen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function VerabschiedenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        className="px-2.5 py-1 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await verabschiedeItStrategie(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Verabschiedung fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Verabschiedet…" : "Verabschieden"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function ItStrategiePanel({ items, canWrite, canApprove }: { items: ItStrategie[]; canWrite: boolean; canApprove: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="strategie">
      <CardHeader>
        <CardTitle>IT-Strategie</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ IT-Strategie</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Verabschiedung und Review-Zyklus, mit Konsistenzvermerk zur Geschäfts-/Risikostrategie (BAIT Kap. 1).
        </p>
        {adding && <div className="mb-3"><StrategieForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle p-4">
              <div>
                <div className="text-sm font-semibold text-foreground">IT-Strategie {s.jahr}</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">
                  {s.status === "verabschiedet" && s.verabschiedetAm ? `Verabschiedet ${s.verabschiedetAm.slice(0, 10)}` : "Noch nicht verabschiedet"}
                  {s.konsistenzpruefungGeschaeftsstrategie && <><br />{s.konsistenzpruefungGeschaeftsstrategie}</>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={s.status} />
                {s.status === "entwurf" && canApprove && <VerabschiedenButton id={s.id} />}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine IT-Strategie erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
