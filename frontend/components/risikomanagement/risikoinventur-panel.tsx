"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRisikoinventurEintrag, type RisikoinventurInput } from "@/app/(app)/risikomanagement/actions";
import type { Risikoinventur } from "@/lib/regstack/risikomanagement";
import { RISIKOART_LABELS, type RisikoartKategorie } from "@/lib/regstack/risikomanagement-labels";

const KATEGORIEN = Object.keys(RISIKOART_LABELS) as RisikoartKategorie[];

const emptyForm = (): RisikoinventurInput => ({
  jahr: new Date().getFullYear(),
  kategorie: KATEGORIEN[0],
  bezeichnung: "",
  wesentlichkeit: "wesentlich",
  begruendung: "",
  naechsteUeberpruefung: "",
});

function InventurForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRisikoinventurEintrag(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={form.kategorie} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, kategorie: e.target.value as RisikoartKategorie }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {KATEGORIEN.map((k) => <option key={k} value={k}>{RISIKOART_LABELS[k]}</option>)}
        </select>
        <input type="number" placeholder="Jahr" value={form.jahr} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, jahr: Number(e.target.value) }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Gegenstand" value={form.bezeichnung} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={form.wesentlichkeit} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, wesentlichkeit: e.target.value as "wesentlich" | "nicht_wesentlich" }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="wesentlich">wesentlich</option>
          <option value="nicht_wesentlich">nicht wesentlich</option>
        </select>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste Überprüfung
          <input type="date" value={form.naechsteUeberpruefung} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, naechsteUeberpruefung: e.target.value }))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <textarea placeholder="Begründung" value={form.begruendung} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, begruendung: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.bezeichnung.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function RisikoinventurPanel({ items, canWrite }: { items: Risikoinventur[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="inventur">
      <CardHeader>
        <CardTitle>Risikoinventur</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Eintrag</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Jährliche Wesentlichkeitseinstufung je Risikoart — auch geprüfte, nicht wesentliche Risikoarten bleiben im Register.
        </p>
        {adding && <div className="mb-3"><InventurForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Risikoart</th>
                <th className="px-3 py-2 font-medium">Gegenstand</th>
                <th className="px-3 py-2 font-medium">Wesentlichkeit</th>
                <th className="px-3 py-2 font-medium">Nächste Prüfung</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{RISIKOART_LABELS[item.kategorie]}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.bezeichnung}</td>
                  <td className="px-3 py-2"><StatusPill status={item.wesentlichkeit} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{item.naechsteUeberpruefung?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Noch keine Risikoinventur erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
