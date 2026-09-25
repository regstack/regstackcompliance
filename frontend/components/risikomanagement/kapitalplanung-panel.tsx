"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmKapitalplanung, updateRmKapitalplanung, verabschiedeRmKapitalplanung, type RmKapitalplanungInput } from "@/app/(app)/risikomanagement/actions";
import type { RmKapitalplanung } from "@/lib/regstack/risikomanagement";

function emptyForm(): RmKapitalplanungInput {
  return {
    jahr: new Date().getFullYear(),
    planungshorizontJahre: 3,
    adverseSzenarienBeruecksichtigt: false,
    konsistenzGeschaeftsplanung: "",
  };
}

function KapitalplanungForm({ initial, onSubmit, onDone, onCancel }: {
  initial?: RmKapitalplanungInput;
  onSubmit: (fields: RmKapitalplanungInput) => Promise<unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => initial ?? emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="number" placeholder="Jahr" value={form.jahr} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, jahr: Number(e.target.value) }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Planungshorizont (Jahre)
          <input type="number" min={1} value={form.planungshorizontJahre} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, planungshorizontJahre: Number(e.target.value) }))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <textarea placeholder="Konsistenz zur operativen Geschäftsplanung" value={form.konsistenzGeschaeftsplanung} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, konsistenzGeschaeftsplanung: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
          <input type="checkbox" checked={form.adverseSzenarienBeruecksichtigt} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, adverseSzenarienBeruecksichtigt: e.target.checked }))} />
          Adverse Entwicklungen berücksichtigt (Tz. 10)
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>
          {pending ? "Speichert…" : initial ? "Speichern" : "Als Entwurf anlegen"}
        </Button>
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
  const [editingId, setEditingId] = useState<string | null>(null);

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
        {adding && (
          <div className="mb-3">
            <KapitalplanungForm onSubmit={addRmKapitalplanung} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((k) => (
            <div key={k.id} className="rounded-lg border border-border-subtle p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">Kapitalplanung {k.jahr}</div>
                {/* Nur solange nicht verabschiedet bearbeitbar — die Route lehnt eine verabschiedete
                    Kapitalplanung selbst ab (422), siehe kapitalplanung.routes.ts. */}
                {canWrite && !k.verabschiedetAm && editingId !== k.id && (
                  <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditingId(k.id)}>Bearbeiten</Button>
                )}
              </div>
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
              {editingId === k.id && (
                <div className="mt-3">
                  <KapitalplanungForm
                    initial={{
                      jahr: k.jahr,
                      planungshorizontJahre: k.planungshorizontJahre,
                      adverseSzenarienBeruecksichtigt: k.adverseSzenarienBeruecksichtigt,
                      konsistenzGeschaeftsplanung: k.konsistenzGeschaeftsplanung ?? "",
                    }}
                    onSubmit={(fields) => updateRmKapitalplanung(k.id, fields)}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Kapitalplanung erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
