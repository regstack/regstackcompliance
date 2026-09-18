"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addGlMitteilung, addSonderauftrag, type GlMitteilungInput, type SonderauftragInput } from "@/app/(app)/interne-revision/governance/actions";

export type GlMitteilungRow = { id: string; date: string; decision: string };
export type SonderauftragRow = { id: string; date: string; ordered_by: string | null; subject: string; reason: string | null };

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

function AddMitteilungForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<GlMitteilungInput>({ date: new Date().toISOString().slice(0, 10), decision: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addGlMitteilung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <input type="date" className={inputCls} disabled={pending} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <input placeholder="Wesentliche Entscheidung" className={inputCls} disabled={pending} value={form.decision}
          onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value }))} />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.decision.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function AddSonderauftragForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<SonderauftragInput>({ date: new Date().toISOString().slice(0, 10), ordered_by: "", subject: "", reason: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addSonderauftrag(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" className={inputCls} disabled={pending} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <input placeholder="Angeordnet durch" className={inputCls} disabled={pending} value={form.ordered_by ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ordered_by: e.target.value }))} />
        <input placeholder="Gegenstand" className={inputCls} disabled={pending} value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
      </div>
      <input placeholder="Begründung" className={`mt-2 ${inputCls}`} disabled={pending} value={form.reason ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.subject.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function GlPanel({
  mitteilungen, sonderauftraege, canWriteGl,
}: {
  mitteilungen: GlMitteilungRow[];
  sonderauftraege: SonderauftragRow[];
  canWriteGl: boolean;
}) {
  const [addingMitteilung, setAddingMitteilung] = useState(false);
  const [addingOrder, setAddingOrder] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Der Revision mitgeteilte wesentliche Entscheidungen</CardTitle>
          {canWriteGl && !addingMitteilung && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingMitteilung(true)}>+ Mitteilung</Button>}
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-xs text-muted-foreground">Tz. 1 S.5 — die Geschäftsleitung muss der Revision wesentliche Entscheidungen mitteilen.</p>
          {addingMitteilung && <AddMitteilungForm onDone={() => setAddingMitteilung(false)} />}
          {mitteilungen.map((m) => (
            <div key={m.id} className="flex items-start gap-3 border-b border-border-subtle py-1.5 text-sm last:border-0">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{m.date}</span>
              <span className="text-foreground">{m.decision}</span>
            </div>
          ))}
          {mitteilungen.length === 0 && <p className="text-sm text-muted-foreground">Keine Mitteilung protokolliert.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Von der Geschäftsleitung angeordnete Sonderprüfungen</CardTitle>
          {canWriteGl && !addingOrder && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingOrder(true)}>+ Anordnung</Button>}
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-xs text-muted-foreground">Tz. 2 S.3 — Direktionsrecht der Geschäftsleitung zur Anordnung zusätzlicher Prüfungen.</p>
          {addingOrder && <AddSonderauftragForm onDone={() => setAddingOrder(false)} />}
          {sonderauftraege.map((o) => (
            <div key={o.id} className="border-b border-border-subtle py-1.5 text-sm last:border-0">
              <div className="flex items-start gap-3">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{o.date}</span>
                <span className="text-foreground">{o.ordered_by} — {o.subject}</span>
              </div>
              {o.reason && <div className="ml-[52px] text-xs text-muted-foreground">({o.reason})</div>}
            </div>
          ))}
          {sonderauftraege.length === 0 && <p className="text-sm text-muted-foreground">Keine Sonderprüfung angeordnet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
