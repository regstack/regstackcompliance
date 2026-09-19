"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { daysUntil } from "@/lib/regstack/revisions-utils";
import { addSperrfrist, updateSperrfrist, type SperrfristInput } from "@/app/(app)/interne-revision/personal/actions";

export type SperrfristRow = {
  id: string; person_id: string | null; name: string | null; from_unit: string | null; transfer_date: string | null;
  barred_areas: string | null; bar_end_date: string | null; deviation: boolean; deviation_reason: string | null;
  person: { full_name: string } | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const emptyForm = (): SperrfristInput => ({ person_id: null, name: "", from_unit: "", transfer_date: null, barred_areas: "", bar_end_date: null, deviation: false, deviation_reason: "" });

function SperrfristForm({
  initial, personen, onDone, onCancel,
}: {
  initial?: SperrfristRow;
  personen: { id: string; full_name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SperrfristInput>(() =>
    initial
      ? { person_id: initial.person_id, name: initial.name ?? "", from_unit: initial.from_unit ?? "", transfer_date: initial.transfer_date, barred_areas: initial.barred_areas ?? "", bar_end_date: initial.bar_end_date, deviation: initial.deviation, deviation_reason: initial.deviation_reason ?? "" }
      : emptyForm()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateSperrfrist(initial.id, form);
        else await addSperrfrist(form);
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
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Wechseldatum
          <input type="date" value={form.transfer_date ?? ""} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value || null }))} className={`${inputCls} normal-case`} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Sperrfrist-Ende
          <input type="date" value={form.bar_end_date ?? ""} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, bar_end_date: e.target.value || null }))} className={`${inputCls} normal-case`} />
        </label>
      </div>
      <label className="mt-2 flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        Gesperrte Prüfungsbereiche (Selbstprüfungsverbot)
        <input value={form.barred_areas ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, barred_areas: e.target.value }))} className={`${inputCls} normal-case`} />
      </label>
      <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" className="h-4 w-4 accent-copper-500" checked={form.deviation} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, deviation: e.target.checked }))} />
        Abweichung von der Regel-Übergangsfrist (Tz. 4 S.4)
      </label>
      {form.deviation && (
        <textarea placeholder="Begründung der Abweichung" rows={2} value={form.deviation_reason ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, deviation_reason: e.target.value }))} className={`mt-2 ${inputCls} normal-case`} aria-label="Begründung der Abweichung" />
      )}
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function SperrfristenPanel({
  sperrfristen, personen, canWrite,
}: {
  sperrfristen: SperrfristRow[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wechsel aus anderen Organisationseinheiten</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Wechsel erfassen</Button>}
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tz. 4 — Übergangsfrist i. d. R. mindestens ein Jahr, innerhalb derer keine Prüfung von
          Tätigkeiten erfolgen darf, die gegen das Verbot der Selbstprüfung verstößt.
        </p>
        {adding && <SperrfristForm personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
        {sperrfristen.map((t) => {
          const daysLeft = daysUntil(t.bar_end_date);
          return editingId === t.id ? (
            <SperrfristForm key={t.id} initial={t} personen={personen} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={t.id} className="rounded-md border border-border-subtle p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{t.person?.full_name ?? t.name ?? "—"}</span>
                <div className="flex items-center gap-2">
                  {daysLeft !== null && daysLeft > 0 ? (
                    <StatusPill status="verbesserungsbeduerftig" label={`gesperrt — noch ${daysLeft} Tage`} />
                  ) : (
                    <StatusPill status="bestaetigt" label="Frist abgelaufen" />
                  )}
                  {t.deviation && <StatusPill status="verbesserungsbeduerftig" label="Abweichung dokumentiert" />}
                  {canWrite && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(t.id)}>Bearbeiten</Button>}
                </div>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {t.from_unit ?? "—"} → gesperrt: {t.barred_areas ?? "—"} · Wechsel {t.transfer_date ?? "—"} · Ende {t.bar_end_date ?? "—"}
              </div>
              {t.deviation && t.deviation_reason && <div className="mt-1 text-xs text-muted-foreground">Begründung: {t.deviation_reason}</div>}
            </div>
          );
        })}
        {sperrfristen.length === 0 && <p className="text-sm text-muted-foreground">Keine Wechsel erfasst.</p>}
      </CardBody>
    </Card>
  );
}
