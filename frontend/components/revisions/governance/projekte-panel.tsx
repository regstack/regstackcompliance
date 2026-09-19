"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addProjektbegleitung, updateProjektbegleitung, type ProjektbegleitungInput } from "@/app/(app)/interne-revision/governance/actions";

export type ProjektRow = {
  id: string; name: string; role: string; start_date: string | null; end_date: string | null;
  status: string; ir_contact_person_id: string | null; access_granted: boolean; notes: string | null;
  ir_contact: { full_name: string } | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const emptyForm = (): ProjektbegleitungInput => ({ name: "", role: "begleitend", start_date: null, end_date: null, status: "laufend", ir_contact_person_id: null, access_granted: false, notes: "" });

function ProjektForm({
  initial, personen, onDone, onCancel,
}: {
  initial?: ProjektRow;
  personen: { id: string; full_name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProjektbegleitungInput>(() =>
    initial
      ? { name: initial.name, role: initial.role, start_date: initial.start_date, end_date: initial.end_date, status: initial.status as "laufend" | "abgeschlossen", ir_contact_person_id: initial.ir_contact_person_id, access_granted: initial.access_granted, notes: initial.notes ?? "" }
      : emptyForm()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateProjektbegleitung(initial.id, form);
        else await addProjektbegleitung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input placeholder="Projekt" className={inputCls} disabled={pending} value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Projekt" />
        <select className={inputCls} disabled={pending} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} aria-label="Rolle">
          <option value="begleitend">projektbegleitend (prüfend)</option>
          <option value="beratend">beratend (Tz. 3 S.3)</option>
        </select>
        <select className={inputCls} disabled={pending} value={form.ir_contact_person_id ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ir_contact_person_id: e.target.value || null }))} aria-label="Ansprechpartner Revision">
          <option value="">— Ansprechpartner Revision —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Beginn
          <input type="date" className={`${inputCls} normal-case`} disabled={pending} value={form.start_date ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value || null }))} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Ende
          <input type="date" className={`${inputCls} normal-case`} disabled={pending} value={form.end_date ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value || null }))} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Status
          <select className={`${inputCls} normal-case`} disabled={pending} value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "laufend" | "abgeschlossen" }))}>
            <option value="laufend">laufend</option>
            <option value="abgeschlossen">abgeschlossen</option>
          </select>
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" disabled={pending} checked={form.access_granted}
          onChange={(e) => setForm((f) => ({ ...f, access_granted: e.target.checked }))} />
        Vollständiges Informations- und Zugriffsrecht im Projekt gewährleistet (Tz. 1 S.3/4)
      </label>
      <textarea placeholder="Notizen" rows={2} className={`mt-2 ${inputCls}`} disabled={pending}
        value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} aria-label="Notizen" />
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.name.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function ProjektePanel({
  projekte, personen, canWrite,
}: {
  projekte: ProjektRow[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Begleitung wesentlicher Projekte</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Projektbegleitung erfassen</Button>}
      </CardHeader>
      <CardBody className="space-y-3">
        {adding && <ProjektForm personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
        {projekte.map((p) => (
          editingId === p.id ? (
            <ProjektForm key={p.id} initial={p} personen={personen} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={p.id} className="rounded-md border border-border-subtle p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{p.name || "(Projekt ohne Bezeichnung)"}</span>
                <div className="flex items-center gap-2">
                  <StatusPill status={p.access_granted ? "bestaetigt" : "beendet"} label={p.access_granted ? "Zugriffsrecht gewährleistet" : "Zugriffsrecht eingeschränkt"} />
                  <StatusPill status={p.status} />
                  {canWrite && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(p.id)}>Bearbeiten</Button>}
                </div>
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                Rolle: {p.role === "beratend" ? "beratend" : "projektbegleitend (prüfend)"} · Ansprechpartner: {p.ir_contact?.full_name ?? "—"} · {p.start_date ?? "—"} bis {p.end_date ?? "—"}
              </div>
              {p.notes && <div className="mt-1 text-xs text-muted-foreground">{p.notes}</div>}
            </div>
          )
        ))}
        {projekte.length === 0 && <p className="text-sm text-muted-foreground">Keine Projektbegleitung erfasst.</p>}
      </CardBody>
    </Card>
  );
}
