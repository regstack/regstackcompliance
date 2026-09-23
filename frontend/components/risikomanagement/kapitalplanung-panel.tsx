"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmKapitalplanung, verabschiedeRmKapitalplanung } from "@/app/(app)/risikomanagement/actions";
import type { RmKapitalplanung } from "@/lib/regstack/risikomanagement";

function KapitalplanungForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [planungshorizontJahre, setPlanungshorizontJahre] = useState(3);
  const [adverseSzenarienBeruecksichtigt, setAdverseSzenarienBeruecksichtigt] = useState(false);
  const [konsistenzGeschaeftsplanung, setKonsistenzGeschaeftsplanung] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRmKapitalplanung({ jahr, planungshorizontJahre, adverseSzenarienBeruecksichtigt, konsistenzGeschaeftsplanung });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="number" placeholder="Jahr" value={jahr} disabled={pending}
          onChange={(e) => setJahr(Number(e.target.value))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Planungshorizont (Jahre)
          <input type="number" min={1} value={planungshorizontJahre} disabled={pending}
            onChange={(e) => setPlanungshorizontJahre(Number(e.target.value))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <textarea placeholder="Konsistenz zur operativen Geschäftsplanung" value={konsistenzGeschaeftsplanung} disabled={pending} rows={2}
          onChange={(e) => setKonsistenzGeschaeftsplanung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
          <input type="checkbox" checked={adverseSzenarienBeruecksichtigt} disabled={pending}
            onChange={(e) => setAdverseSzenarienBeruecksichtigt(e.target.checked)} />
          Adverse Entwicklungen berücksichtigt (Tz. 10)
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
              await verabschiedeRmKapitalplanung(id);
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

export function KapitalplanungPanel({ items, canWrite, canApprove }: { items: RmKapitalplanung[]; canWrite: boolean; canApprove: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="kapitalplanung">
      <CardHeader>
        <CardTitle>Kapitalplanung</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Kapitalplanung</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Jährlicher Prozess zur Planung des künftigen Kapitalbedarfs und des verfügbaren Kapitals, mehrjähriger
          Planungshorizont, im Einklang mit der operativen Geschäftsplanung (AT 4.1 Tz. 10).
        </p>
        {adding && <div className="mb-3"><KapitalplanungForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((k) => (
            <div key={k.id} className="rounded-lg border border-border-subtle p-3.5">
              <div className="text-sm font-semibold text-foreground">Kapitalplanung {k.jahr}</div>
              <div className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Planungshorizont {k.planungshorizontJahre} Jahre
                {k.konsistenzGeschaeftsplanung && <><br />{k.konsistenzGeschaeftsplanung}</>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill status={k.verabschiedetAm ? "verabschiedet" : "entwurf"} />
                {k.adverseSzenarienBeruecksichtigt && <span className="text-[11px] text-muted-foreground">Adverse Szenarien berücksichtigt</span>}
              </div>
              {!k.verabschiedetAm && canApprove && <div className="mt-2"><VerabschiedenButton id={k.id} /></div>}
              {k.verabschiedetAm && <div className="mt-2 text-xs text-status-success">Verabschiedet {k.verabschiedetAm.slice(0, 10)}</div>}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Kapitalplanung erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
