"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { StatusPill } from "@/components/ui/status-pill";
import { daysUntil } from "@/lib/regstack/revisions-utils";
import { addQualitaetssicherung, type QualitaetssicherungInput } from "@/app/(app)/interne-revision/governance/actions";

export type QsRow = {
  id: string; date: string; type: string; anlass: string | null;
  scope: { planung?: boolean; methoden?: boolean; qualitaet?: boolean } | null;
  reviewer: string | null; result: string | null; next_due: string | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const SCOPE_ITEMS: { k: "planung" | "methoden" | "qualitaet"; l: string }[] = [
  { k: "planung", l: "Planung" }, { k: "methoden", l: "Methoden" }, { k: "qualitaet", l: "Qualität" },
];

function AddQsForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<QualitaetssicherungInput>({
    date: new Date().toISOString().slice(0, 10), type: "regelmaessig", anlass: "",
    scope: { planung: false, methoden: false, qualitaet: false }, reviewer: "", result: "", next_due: null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addQualitaetssicherung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" className={inputCls} disabled={pending} value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} aria-label="Datum" />
        <select className={inputCls} disabled={pending} value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "regelmaessig" | "anlassbezogen" }))} aria-label="Art">
          <option value="regelmaessig">regelmäßig</option>
          <option value="anlassbezogen">anlassbezogen</option>
        </select>
        <input placeholder="Durchgeführt durch" className={inputCls} disabled={pending} value={form.reviewer ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, reviewer: e.target.value }))} aria-label="Durchgeführt durch" />
      </div>
      {form.type === "anlassbezogen" && (
        <input placeholder="Anlass" className={`mt-2 ${inputCls}`} disabled={pending} value={form.anlass ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, anlass: e.target.value }))} aria-label="Anlass" />
      )}
      <div className="mt-2 flex flex-wrap gap-4">
        {SCOPE_ITEMS.map((s) => (
          <label key={s.k} className="flex items-center gap-1.5 text-xs text-foreground">
            <input type="checkbox" disabled={pending} checked={form.scope[s.k] ?? false}
              onChange={(e) => setForm((f) => ({ ...f, scope: { ...f.scope, [s.k]: e.target.checked } }))} />
            {s.l}
          </label>
        ))}
      </div>
      <textarea placeholder="Ergebnis und Weiterentwicklungsmaßnahmen" rows={2} className={`mt-2 ${inputCls}`} disabled={pending}
        value={form.result ?? ""} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} aria-label="Ergebnis und Weiterentwicklungsmaßnahmen" />
      {form.type === "regelmaessig" && (
        <label className="mt-2 flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste regelmäßige Überprüfung
          <input type="date" className={`${inputCls} normal-case`} disabled={pending} value={form.next_due ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, next_due: e.target.value || null }))} />
        </label>
      )}
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function QsPanel({ qs, canWrite, qsIntervallMonate }: { qs: QsRow[]; canWrite: boolean; qsIntervallMonate: number }) {
  const [adding, setAdding] = useState(false);

  const regular = qs.filter((q) => q.type === "regelmaessig").slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastRegular = regular[0] ?? null;
  const qsOverdue = !lastRegular || (daysUntil(lastRegular.next_due) ?? -1) < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Überprüfung von Planung, Methoden und Qualität</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Überprüfung erfassen</Button>}
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tz. 1 S.2 — Planung, Methoden und Qualität der Revision sind regelmäßig UND anlassbezogen zu
          überprüfen und weiterzuentwickeln.
        </p>
        {qsOverdue && (
          <Banner tone="warn" title="Regelmäßige Überprüfung überfällig">
            Letzte regelmäßige Überprüfung: {lastRegular?.date ?? "keine dokumentiert"} · Intervall: {qsIntervallMonate} Monate.
          </Banner>
        )}
        {adding && <AddQsForm onDone={() => setAdding(false)} />}
        {qs.map((q) => {
          const scopeMissing = !(q.scope?.planung && q.scope?.methoden && q.scope?.qualitaet);
          const scopeLabels = SCOPE_ITEMS.filter((s) => q.scope?.[s.k]).map((s) => s.l).join(", ") || "—";
          return (
            <div key={q.id} className="rounded-md border border-border-subtle p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{q.date} — {q.type === "regelmaessig" ? "regelmäßige Überprüfung" : "anlassbezogene Überprüfung"}</span>
                <div className="flex items-center gap-2">
                  {q.type === "regelmaessig" && scopeMissing && <StatusPill status="verbesserungsbeduerftig" label="Gegenstand unvollständig" />}
                  <span className="inline-flex items-center rounded-full border border-copper-500/40 bg-copper-700/20 px-2.5 py-0.5 text-xs font-medium text-copper-300">
                    {q.type === "regelmaessig" ? "Turnus" : "Anlass"}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                Gegenstand: {scopeLabels} · durchgeführt durch {q.reviewer || "–"}
                {q.type === "regelmaessig" && <> · nächste Fälligkeit {q.next_due || "–"}</>}
              </div>
              {q.result && <div className="mt-1 text-xs text-muted-foreground">{q.result}</div>}
            </div>
          );
        })}
        {qs.length === 0 && <p className="text-sm text-muted-foreground">Keine Überprüfung dokumentiert.</p>}
      </CardBody>
    </Card>
  );
}
