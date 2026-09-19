"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addZugriffsvorfall, updateZugriffsvorfall, type ZugriffsvorfallInput } from "@/app/(app)/interne-revision/governance/actions";

export type ZugriffsvorfallRow = {
  id: string; date: string; area: string | null; description: string | null; escalated_to: string | null; resolved_date: string | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const emptyForm = (): ZugriffsvorfallInput => ({ date: new Date().toISOString().slice(0, 10), area: "", description: "", escalated_to: "", resolved_date: null });

function VorfallForm({
  initial, onDone, onCancel,
}: {
  initial?: ZugriffsvorfallRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ZugriffsvorfallInput>(() =>
    initial
      ? { date: initial.date, area: initial.area ?? "", description: initial.description ?? "", escalated_to: initial.escalated_to ?? "", resolved_date: initial.resolved_date }
      : emptyForm()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateZugriffsvorfall(initial.id, form);
        else await addZugriffsvorfall(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Datum
          <input type="date" className={`${inputCls} normal-case`} disabled={pending} value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </label>
        <input placeholder="Betroffener Bereich" className={inputCls} disabled={pending} value={form.area ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} aria-label="Betroffener Bereich" />
        <input placeholder="Eskaliert an" className={inputCls} disabled={pending} value={form.escalated_to ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, escalated_to: e.target.value }))} aria-label="Eskaliert an" />
      </div>
      <textarea placeholder="Sachverhalt" rows={2} className={`mt-2 ${inputCls}`} disabled={pending}
        value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} aria-label="Sachverhalt" />
      <label className="mt-2 flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        Behoben am
        <input type="date" className={`${inputCls} normal-case max-w-xs`} disabled={pending} value={form.resolved_date ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, resolved_date: e.target.value || null }))} />
      </label>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function ZugriffsvorfaellePanel({ vorfaelle, canWrite }: { vorfaelle: ZugriffsvorfallRow[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Einschränkungen des Informations- und Zugriffsrechts</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Einschränkung dokumentieren</Button>}
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tz. 1 S.3/4 — vollständiges und uneingeschränktes Informations- und Zugriffsrecht, auch bei
          der Begleitung wesentlicher Projekte, jederzeit zu gewährleisten.
        </p>
        {adding && <VorfallForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
        {vorfaelle.map((i) => (
          editingId === i.id ? (
            <VorfallForm key={i.id} initial={i} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={i.id} className="rounded-md border border-border-subtle p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{i.date} — {i.area || "(Bereich offen)"}</span>
                <div className="flex items-center gap-2">
                  <StatusPill status={i.resolved_date ? "bestaetigt" : "beendet"} label={i.resolved_date ? `behoben am ${i.resolved_date}` : "offen"} />
                  {canWrite && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(i.id)}>Bearbeiten</Button>}
                </div>
              </div>
              {i.description && <div className="mt-1 text-xs text-muted-foreground">{i.description}</div>}
              {i.escalated_to && <div className="mt-1 text-xs text-muted-foreground">Eskaliert an: {i.escalated_to}</div>}
            </div>
          )
        ))}
        {vorfaelle.length === 0 && <p className="text-sm text-muted-foreground">Keine Einschränkungen dokumentiert.</p>}
      </CardBody>
    </Card>
  );
}
