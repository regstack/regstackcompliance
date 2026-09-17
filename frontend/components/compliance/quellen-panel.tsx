"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addQuelle, updateQuelle, type QuelleInput } from "@/app/(app)/compliance/actions";
import { naechsteFaelligkeit, isOverdue } from "@/lib/regstack/compliance-utils";

const TURNUS_OPTS = ["monatlich", "quartalsweise", "halbjaehrlich", "jaehrlich"];

type Quelle = {
  id: string; bezeichnung: string; bezugsweg: string | null; turnus: string | null;
  verantwortlich_person_id: string | null; letzte_durchsicht: string | null;
  persons: { full_name: string } | null;
};

const emptyForm = (): QuelleInput => ({ bezeichnung: "", bezugsweg: "", turnus: "monatlich", verantwortlich_person_id: null, letzte_durchsicht: null });

function QuelleForm({
  initial, personen, onDone, onCancel,
}: {
  initial?: Quelle;
  personen: { id: string; full_name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<QuelleInput>(() =>
    initial
      ? { bezeichnung: initial.bezeichnung, bezugsweg: initial.bezugsweg ?? "", turnus: initial.turnus ?? "monatlich", verantwortlich_person_id: initial.verantwortlich_person_id, letzte_durchsicht: initial.letzte_durchsicht }
      : emptyForm()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateQuelle(initial.id, form);
        else await addQuelle(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Bezeichnung" value={form.bezeichnung} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Bezugsweg (z. B. Newsletter, Website)" value={form.bezugsweg} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezugsweg: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={form.turnus} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, turnus: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {TURNUS_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.verantwortlich_person_id ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, verantwortlich_person_id: e.target.value || null }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">— Verantwortlich —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Letzte Durchsicht
          <input type="date" value={form.letzte_durchsicht ?? ""} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, letzte_durchsicht: e.target.value || null }))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.bezeichnung.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function QuellenPanel({
  quellen, personen, canWrite,
}: {
  quellen: Quelle[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quellenregister (Tz. 2)</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Quelle</Button>}
      </CardHeader>
      <CardBody>
        {adding && <div className="mb-3"><QuelleForm personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Bezeichnung</th>
                <th className="px-3 py-2 font-medium">Bezugsweg</th>
                <th className="px-3 py-2 font-medium">Turnus</th>
                <th className="px-3 py-2 font-medium">Verantwortlich</th>
                <th className="px-3 py-2 font-medium">Letzte Durchsicht</th>
                <th className="px-3 py-2 font-medium">Nächste Fälligkeit</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {quellen.map((q) => {
                const due = naechsteFaelligkeit(q.letzte_durchsicht, q.turnus);
                const overdue = isOverdue(due);
                return editingId === q.id ? (
                  <tr key={q.id}><td colSpan={7} className="px-3 py-3"><QuelleForm initial={q} personen={personen} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} /></td></tr>
                ) : (
                  <tr key={q.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{q.bezeichnung}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.bezugsweg ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.turnus ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.persons?.full_name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.letzte_durchsicht ?? "—"}</td>
                    <td className="px-3 py-2">{due ? <StatusPill status={overdue ? "beendet" : "aktiv"} label={overdue ? `${due} (überfällig)` : due} /> : "—"}</td>
                    {canWrite && <td className="px-3 py-2 text-right"><Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(q.id)}>Bearbeiten</Button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
