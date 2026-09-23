"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmStresstest } from "@/app/(app)/risikomanagement/actions";
import type { RmStresstest } from "@/lib/regstack/risikomanagement";
import {
  RISIKOART_LABELS,
  STRESSTEST_TYP_LABELS,
  STRESSTEST_EBENE_LABELS,
  type RmStresstestTyp,
  type RmStresstestEbene,
  type RisikoartKategorie,
} from "@/lib/regstack/risikomanagement-labels";

function StresstestForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [typ, setTyp] = useState<RmStresstestTyp>("szenarioanalyse_hypothetisch");
  const [ebene, setEbene] = useState<RmStresstestEbene>("gesamtinstitut");
  const [szenariobeschreibung, setSzenariobeschreibung] = useState("");
  const [durchgefuehrtAm, setDurchgefuehrtAm] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [rtfBeruecksichtigt, setRtfBeruecksichtigt] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRmStresstest({
          jahr, typ, ebene,
          betroffeneRisikoarten: [] as RisikoartKategorie[],
          szenariobeschreibung,
          risikofaktoren: "",
          wechselwirkungenBeruecksichtigt: false,
          ergebnis,
          rtfBeruecksichtigt,
          handlungsbedarf: "",
          durchgefuehrtAm,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="number" placeholder="Jahr" value={jahr} disabled={pending}
          onChange={(e) => setJahr(Number(e.target.value))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Durchgeführt am
          <input type="date" value={durchgefuehrtAm} disabled={pending} onChange={(e) => setDurchgefuehrtAm(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <select value={typ} disabled={pending} onChange={(e) => setTyp(e.target.value as RmStresstestTyp)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(STRESSTEST_TYP_LABELS) as RmStresstestTyp[]).map((t) => <option key={t} value={t}>{STRESSTEST_TYP_LABELS[t]}</option>)}
        </select>
        <select value={ebene} disabled={pending} onChange={(e) => setEbene(e.target.value as RmStresstestEbene)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(STRESSTEST_EBENE_LABELS) as RmStresstestEbene[]).map((eb) => <option key={eb} value={eb}>{STRESSTEST_EBENE_LABELS[eb]}</option>)}
        </select>
        <textarea placeholder="Szenariobeschreibung" value={szenariobeschreibung} disabled={pending} rows={2}
          onChange={(e) => setSzenariobeschreibung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Ergebnis" value={ergebnis} disabled={pending} rows={2}
          onChange={(e) => setErgebnis(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
          <input type="checkbox" checked={rtfBeruecksichtigt} disabled={pending} onChange={(e) => setRtfBeruecksichtigt(e.target.checked)} />
          Bei der Risikotragfähigkeit berücksichtigt (Tz. 6)
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !szenariobeschreibung.trim() || !durchgefuehrtAm} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function StresstestPanel({ items, canWrite }: { items: RmStresstest[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="stresstests">
      <CardHeader>
        <CardTitle>Stresstests</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Stresstest</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Regelmäßige und anlassbezogene Stresstests für wesentliche Risiken und das Gesamtrisikoprofil,
          inkl. schwerem konjunkturellem Abschwung und inversen Stresstests (AT 4.3.3).
        </p>
        {adding && <div className="mb-3"><StresstestForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-lg border border-border-subtle p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-foreground">{STRESSTEST_TYP_LABELS[s.typ]}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{STRESSTEST_EBENE_LABELS[s.ebene]} · {s.jahr}</span>
                </div>
                {s.rtfBeruecksichtigt && <StatusPill status="freigegeben" label="RTF berücksichtigt" />}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground">{s.szenariobeschreibung}</p>
              {s.betroffeneRisikoarten.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.betroffeneRisikoarten.map((k) => (
                    <span key={k} className="rounded-full border border-border-subtle px-2 py-0.5 text-[10.5px] text-muted-foreground">
                      {RISIKOART_LABELS[k]}
                    </span>
                  ))}
                </div>
              )}
              {s.ergebnis && (
                <div className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-graphite-300">Ergebnis: </span>{s.ergebnis}
                </div>
              )}
              {s.handlungsbedarf && (
                <div className="mt-1 text-[11.5px] leading-relaxed text-status-warning">
                  <span className="font-medium">Handlungsbedarf: </span>{s.handlungsbedarf}
                </div>
              )}
              <div className="mt-2 text-[10.5px] text-muted-foreground">
                Durchgeführt {s.durchgefuehrtAm.slice(0, 10)}
                {s.angemessenheitGeprueftAm && <> · Angemessenheit geprüft {s.angemessenheitGeprueftAm.slice(0, 10)}</>}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Stresstest erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
