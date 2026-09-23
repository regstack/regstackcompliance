"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmModell, validiereRmModell } from "@/app/(app)/risikomanagement/actions";
import type { RmModell } from "@/lib/regstack/risikomanagement";
import { MODELL_KOMPLEXITAET_LABELS, type RmModellKomplexitaet } from "@/lib/regstack/risikomanagement-labels";
import { isOverdue } from "@/lib/regstack/compliance-utils";

function ModellForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [verwendungszweck, setVerwendungszweck] = useState("");
  const [komplexitaet, setKomplexitaet] = useState<RmModellKomplexitaet>("einfach");
  const [technologiegestuetzteInnovationOderKi, setKi] = useState(false);
  const [wesentlicheAnnahmen, setWesentlicheAnnahmen] = useState("");
  const [erklaerbarkeitsbewertung, setErklaerbarkeitsbewertung] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRmModell({ bezeichnung, verwendungszweck, komplexitaet, technologiegestuetzteInnovationOderKi, wesentlicheAnnahmen, erklaerbarkeitsbewertung });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Bezeichnung" value={bezeichnung} disabled={pending} onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Verwendungszweck" value={verwendungszweck} disabled={pending} rows={2}
          onChange={(e) => setVerwendungszweck(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={komplexitaet} disabled={pending} onChange={(e) => setKomplexitaet(e.target.value as RmModellKomplexitaet)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(MODELL_KOMPLEXITAET_LABELS) as RmModellKomplexitaet[]).map((k) => <option key={k} value={k}>{MODELL_KOMPLEXITAET_LABELS[k]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={technologiegestuetzteInnovationOderKi} disabled={pending} onChange={(e) => setKi(e.target.checked)} />
          Technologiegestützte Innovation / KI
        </label>
        <textarea placeholder="Wesentliche Annahmen" value={wesentlicheAnnahmen} disabled={pending} rows={2}
          onChange={(e) => setWesentlicheAnnahmen(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Erklärbarkeitsbewertung" value={erklaerbarkeitsbewertung} disabled={pending} rows={2}
          onChange={(e) => setErklaerbarkeitsbewertung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !bezeichnung.trim() || !verwendungszweck.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ValidierenForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [validierungsergebnis, setValidierungsergebnis] = useState("");
  const [naechsteValidierungFaellig, setNaechsteValidierungFaellig] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await validiereRmModell(id, validierungsergebnis, naechsteValidierungFaellig);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Validierung fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <textarea placeholder="Validierungsergebnis" value={validierungsergebnis} disabled={pending} rows={2}
          onChange={(e) => setValidierungsergebnis(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste Validierung fällig
          <input type="date" value={naechsteValidierungFaellig} disabled={pending} onChange={(e) => setNaechsteValidierungFaellig(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
      </div>
      {error && <p className="mt-1.5 text-xs text-status-danger">{error}</p>}
      <div className="mt-1.5">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !validierungsergebnis.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Validierung erfassen"}
        </Button>
      </div>
    </div>
  );
}

export function ModellPanel({ items, canWrite }: { items: RmModell[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);

  return (
    <Card id="modelle">
      <CardHeader>
        <CardTitle>Modellregister</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Modell</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Auswahl, Annahmen, Datenqualität, Überschreibungen, Erklärbarkeit und Validierungszyklus je eingesetztem
          Modell — inkl. technologiegestützter Innovation/KI (AT 4.3.4, Validierungs-Querverweis AT 4.1 Tz. 9).
        </p>
        {adding && <div className="mb-3"><ModellForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-3">
          {items.map((m) => {
            const overdue = isOverdue(m.naechsteValidierungFaellig ? m.naechsteValidierungFaellig.slice(0, 10) : null);
            return (
              <div key={m.id} className={`rounded-lg border p-3.5 ${overdue ? "border-status-warning/40" : "border-border-subtle"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.bezeichnung}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={m.komplexitaet} label={MODELL_KOMPLEXITAET_LABELS[m.komplexitaet]} />
                    {m.technologiegestuetzteInnovationOderKi && <StatusPill status="projekt" label="KI / Tech-Innovation" />}
                    {overdue && <StatusPill status="overdue" label="Validierung fällig" />}
                  </div>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{m.verwendungszweck}</p>
                {m.erklaerbarkeitsbewertung && (
                  <div className="mt-1.5 text-[11.5px] leading-relaxed text-foreground">
                    <span className="font-medium text-graphite-300">Erklärbarkeit: </span>{m.erklaerbarkeitsbewertung}
                  </div>
                )}
                <div className="mt-2 text-[10.5px] text-muted-foreground">
                  {m.letzteValidierungAm ? `Letzte Validierung ${m.letzteValidierungAm.slice(0, 10)}` : "Noch nicht validiert"}
                  {m.naechsteValidierungFaellig && <> · nächste fällig {m.naechsteValidierungFaellig.slice(0, 10)}</>}
                  {m.validierungUnabhaengig && <> · unabhängig von Modellentwicklung</>}
                </div>
                {m.validierungsergebnis && (
                  <div className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-graphite-300">Validierungsergebnis: </span>{m.validierungsergebnis}
                  </div>
                )}
                {canWrite && (
                  validating === m.id ? (
                    <ValidierenForm id={m.id} onDone={() => setValidating(null)} />
                  ) : (
                    <div className="mt-2">
                      <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setValidating(m.id)}>Validierung erfassen</Button>
                    </div>
                  )
                )}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Modell im Register.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
