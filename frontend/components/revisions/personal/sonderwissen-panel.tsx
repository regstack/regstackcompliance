"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addSonderwissen, updateSonderwissen, type SonderwissenInput } from "@/app/(app)/interne-revision/personal/actions";

export type SonderwissenRow = {
  id: string; person_id: string | null; name: string | null; from_unit: string | null; topic: string | null;
  pruefung_id: string | null; duration_text: string | null;
  person: { full_name: string } | null; pruefung: { subject: string } | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const emptyForm = (): SonderwissenInput => ({ person_id: null, name: "", from_unit: "", topic: "", pruefung_id: null, duration_text: "" });

function SonderwissenForm({
  initial, personen, pruefungen, onDone, onCancel,
}: {
  initial?: SonderwissenRow;
  personen: { id: string; full_name: string }[];
  pruefungen: { id: string; subject: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SonderwissenInput>(() =>
    initial
      ? { person_id: initial.person_id, name: initial.name ?? "", from_unit: initial.from_unit ?? "", topic: initial.topic ?? "", pruefung_id: initial.pruefung_id, duration_text: initial.duration_text ?? "" }
      : emptyForm()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateSonderwissen(initial.id, form);
        else await addSonderwissen(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={form.person_id ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, person_id: e.target.value || null }))} className={inputCls} aria-label="Person">
          <option value="">— Person (optional) —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <input placeholder="Name (falls keine Stammdaten)" value={form.name ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} aria-label="Name (falls keine Stammdaten)" />
        <input placeholder="Bisherige Einheit" value={form.from_unit ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, from_unit: e.target.value }))} className={inputCls} aria-label="Bisherige Einheit" />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input placeholder="Fachgebiet" value={form.topic ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} className={inputCls} aria-label="Fachgebiet" />
        <select value={form.pruefung_id ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, pruefung_id: e.target.value || null }))} className={inputCls} aria-label="Bezug (Prüfung)">
          <option value="">— Bezug (Prüfung, optional) —</option>
          {pruefungen.map((p) => <option key={p.id} value={p.id}>{p.subject}</option>)}
        </select>
        <input placeholder="Dauer / Einsatzzeitraum" value={form.duration_text ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, duration_text: e.target.value }))} className={inputCls} aria-label="Dauer / Einsatzzeitraum" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function SonderwissenPanel({
  sonderwissen, personen, pruefungen, canWrite,
}: {
  sonderwissen: SonderwissenRow[];
  personen: { id: string; full_name: string }[];
  pruefungen: { id: string; subject: string }[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temporärer beratender Einsatz von Spezialwissen</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Einsatz erfassen</Button>}
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tz. 4 S.2 — Mitarbeiter anderer Einheiten dürfen in begründeten Fällen temporär beratend
          eingesetzt werden, aber keine Revisionsaufgaben übernehmen.
        </p>
        {adding && <SonderwissenForm personen={personen} pruefungen={pruefungen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
        {sonderwissen.map((k) => (
          editingId === k.id ? (
            <SonderwissenForm key={k.id} initial={k} personen={personen} pruefungen={pruefungen} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={k.id} className="rounded-md border border-border-subtle p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{k.person?.full_name ?? k.name ?? "—"}</span>
                {canWrite && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(k.id)}>Bearbeiten</Button>}
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {k.from_unit ?? "—"} · Fachgebiet: {k.topic ?? "—"} · Bezug: {k.pruefung?.subject ?? "—"} · {k.duration_text ?? "—"}
              </div>
            </div>
          )
        ))}
        {sonderwissen.length === 0 && <p className="text-sm text-muted-foreground">Kein Einsatz erfasst.</p>}
      </CardBody>
    </Card>
  );
}
