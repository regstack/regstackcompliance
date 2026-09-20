"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addAenderung, setAenderungDisposition, type AenderungInput, type Disposition } from "@/app/(app)/compliance/actions";

const DISPOSITIONS: Disposition[] = ["offen", "geprueft", "kenntnis", "angewandt", "projekt"];
const KRITIKALITAET_OPTS = ["gering", "mittel", "hoch"];

type Aenderung = {
  id: string; quelle_id: string | null; erfasst_am: string; gegenstand: string;
  kritikalitaet: string | null; inkrafttreten: string | null; zugewiesen_an_person_id: string | null;
  disposition: string;
  quellen: { bezeichnung: string } | null;
  persons: { full_name: string } | null;
};

function AenderungForm({
  quellen, personen, onDone, onCancel,
}: {
  quellen: { id: string; bezeichnung: string }[];
  personen: { id: string; full_name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AenderungInput>({
    quelle_id: quellen[0]?.id ?? null,
    erfasst_am: new Date().toISOString().slice(0, 10),
    gegenstand: "",
    kritikalitaet: "mittel",
    inkrafttreten: "",
    zugewiesen_an_person_id: null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addAenderung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={form.quelle_id ?? ""} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, quelle_id: e.target.value || null }))}
          aria-label="Quelle"
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">— Quelle —</option>
          {quellen.map((q) => <option key={q.id} value={q.id}>{q.bezeichnung}</option>)}
        </select>
        <input type="date" value={form.erfasst_am} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, erfasst_am: e.target.value }))}
          aria-label="Erfasst am"
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Gegenstand" value={form.gegenstand} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, gegenstand: e.target.value }))}
          aria-label="Gegenstand"
          className="sm:col-span-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={form.kritikalitaet} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, kritikalitaet: e.target.value }))}
          aria-label="Kritikalität"
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {KRITIKALITAET_OPTS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input placeholder="Inkrafttreten" value={form.inkrafttreten} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, inkrafttreten: e.target.value }))}
          aria-label="Inkrafttreten"
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={form.zugewiesen_an_person_id ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, zugewiesen_an_person_id: e.target.value || null }))}
          aria-label="Zuständige Person"
          className="sm:col-span-2 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">— Zuständige Person —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.gegenstand.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function DispositionCell({ aenderung, canWrite }: { aenderung: Aenderung; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  if (!canWrite) return <StatusPill status={aenderung.disposition} />;
  return (
    <select
      value={aenderung.disposition}
      disabled={pending}
      onChange={(e) => startTransition(() => setAenderungDisposition(aenderung.id, e.target.value as Disposition))}
      aria-label="Disposition"
      className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
    >
      {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>
  );
}

export function AenderungenPanel({
  aenderungen, quellen, personen, canWrite,
}: {
  aenderungen: Aenderung[];
  quellen: { id: string; bezeichnung: string }[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulatorische Änderungen (Tz. 2)</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Änderung erfassen</Button>}
      </CardHeader>
      <CardBody>
        {adding && <div className="mb-3"><AenderungForm quellen={quellen} personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Gegenstand</th>
                <th className="px-3 py-2 font-medium">Quelle</th>
                <th className="px-3 py-2 font-medium">Erfasst</th>
                <th className="px-3 py-2 font-medium">Kritikalität</th>
                <th className="px-3 py-2 font-medium">Inkrafttreten</th>
                <th className="px-3 py-2 font-medium">Zuständig</th>
                <th className="px-3 py-2 font-medium">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {aenderungen.map((a) => (
                <tr key={a.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{a.gegenstand}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.quellen?.bezeichnung ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.erfasst_am}</td>
                  <td className="px-3 py-2"><StatusPill status={a.kritikalitaet ?? "mittel"} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{a.inkrafttreten ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.persons?.full_name ?? "—"}</td>
                  <td className="px-3 py-2"><DispositionCell aenderung={a} canWrite={canWrite} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
