"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmNplKennzahl, updateRmNplKennzahl, type RmNplKennzahlInput } from "@/app/(app)/risikomanagement/actions";
import type { RmNplKennzahl } from "@/lib/regstack/risikomanagement";

function emptyForm(): RmNplKennzahlInput {
  return { periode: "", nplQuote: null, nplBestand: null, zielQuote: null, abbaupfadEingehalten: null, massnahmen: "" };
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function KennzahlForm({ initial, onSubmit, onDone, onCancel }: {
  initial?: RmNplKennzahlInput;
  onSubmit: (fields: RmNplKennzahlInput) => Promise<unknown>;
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
      <div className="grid gap-2 sm:grid-cols-3">
        <input placeholder="Periode (z. B. 2026-Q3)" value={form.periode} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="NPL-Quote (%)" value={form.nplQuote ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, nplQuote: toNumber(e.target.value) }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Zielquote (%)" value={form.zielQuote ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, zielQuote: toNumber(e.target.value) }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="NPL-Bestand (EUR)" value={form.nplBestand ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, nplBestand: toNumber(e.target.value) }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={form.abbaupfadEingehalten ?? false} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, abbaupfadEingehalten: e.target.checked }))} />
          Abbaupfad eingehalten
        </label>
        <textarea placeholder="Maßnahmen" value={form.massnahmen} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, massnahmen: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-3" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.periode.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function NplPanel({ items, canWrite }: { items: RmNplKennzahl[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="npl">
      <CardHeader>
        <CardTitle>NPL-Strategie</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Kennzahl</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Quartalsweises KPI-Tracking des Abbaufortschritts notleidender Risikopositionen (AT 4.2
          Tz. 3) — konditional, nur bei relevantem NPL-Bestand zu pflegen.
        </p>
        {adding && <div className="mb-3"><KennzahlForm onSubmit={addRmNplKennzahl} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Periode</th>
                <th className="px-3 py-2 font-medium">NPL-Quote</th>
                <th className="px-3 py-2 font-medium">Zielquote</th>
                <th className="px-3 py-2 font-medium">Bestand</th>
                <th className="px-3 py-2 font-medium">Abbaupfad</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((k) =>
                editingId === k.id ? (
                  <tr key={k.id} className="border-b border-border-subtle last:border-0">
                    <td colSpan={canWrite ? 6 : 5} className="px-3 py-2">
                      <KennzahlForm
                        initial={{
                          periode: k.periode,
                          nplQuote: k.nplQuote,
                          nplBestand: k.nplBestand,
                          zielQuote: k.zielQuote,
                          abbaupfadEingehalten: k.abbaupfadEingehalten,
                          massnahmen: k.massnahmen ?? "",
                        }}
                        onSubmit={(fields) => updateRmNplKennzahl(k.id, fields)}
                        onDone={() => setEditingId(null)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={k.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{k.periode}</td>
                    <td className="px-3 py-2 text-muted-foreground">{k.nplQuote != null ? `${k.nplQuote} %` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{k.zielQuote != null ? `${k.zielQuote} %` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{k.nplBestand != null ? k.nplBestand.toLocaleString("de-DE") : "—"}</td>
                    <td className="px-3 py-2">
                      {k.abbaupfadEingehalten == null ? "—" : (
                        <StatusPill status={k.abbaupfadEingehalten ? "aktiv" : "kritisch"} label={k.abbaupfadEingehalten ? "eingehalten" : "verfehlt"} />
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditingId(k.id)}>Bearbeiten</Button>
                      </td>
                    )}
                  </tr>
                )
              )}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">Kein relevanter NPL-Bestand erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
