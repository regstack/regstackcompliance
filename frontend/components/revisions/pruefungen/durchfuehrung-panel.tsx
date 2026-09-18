"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { DURCHFUEHRUNG_OPTS, type ExternEinsichtEntry } from "@/lib/regstack/revisions-universum";
import { updateDurchfuehrung, addExternEinsicht } from "@/app/(app)/interne-revision/pruefungen/actions";

function EinsichtForm({ pruefungId, onDone }: { pruefungId: string; onDone: () => void }) {
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [durch, setDurch] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addExternEinsicht(pruefungId, { datum, durch, ergebnis });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="date" value={datum} disabled={pending} onChange={(e) => setDatum(e.target.value)} className={input} />
        <input placeholder="Durch" value={durch} disabled={pending} onChange={(e) => setDurch(e.target.value)} className={input} />
      </div>
      <textarea placeholder="Ergebnis der Einsichtnahme" value={ergebnis} disabled={pending} rows={2}
        onChange={(e) => setErgebnis(e.target.value)} className={`mt-2 w-full ${input}`} />
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !durch.trim()} onClick={submit}>Dokumentieren</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function DurchfuehrungPanel({
  pruefungId, durchfuehrung, externDienstleister, externAblage, externEinsicht, canWrite,
}: {
  pruefungId: string;
  durchfuehrung: string;
  externDienstleister: string | null;
  externAblage: string | null;
  externEinsicht: unknown;
  canWrite: boolean;
}) {
  const [form, setForm] = useState({ durchfuehrung, extern_dienstleister: externDienstleister ?? "", extern_ablage: externAblage ?? "" });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingEinsicht, setAddingEinsicht] = useState(false);
  const einsichten = (externEinsicht as ExternEinsichtEntry[] | null) ?? [];

  const disabled = !canWrite || pending;
  const isExtern = form.durchfuehrung === "ausgelagert" || form.durchfuehrung === "gemischt";
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateDurchfuehrung(pruefungId, {
          durchfuehrung: form.durchfuehrung,
          extern_dienstleister: form.extern_dienstleister || null,
          extern_ablage: form.extern_ablage || null,
        });
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Durchführungsform</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Wird die Revision ganz oder teilweise durch einen externen Dienstleister erbracht, verbleibt die Verantwortung
          beim Institut. Die Arbeitspapiere gehören dann entweder in diese Ablage (Zielbild) oder es ist ein datierter
          Einsichtsnachweis zu führen.
        </p>
        <label className={label}>
          Durchführung
          <select value={form.durchfuehrung} disabled={disabled}
            onChange={(e) => { setForm((f) => ({ ...f, durchfuehrung: e.target.value })); setDirty(true); }} className={input}>
            {DURCHFUEHRUNG_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </label>

        {isExtern && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                Dienstleister
                <input value={form.extern_dienstleister} disabled={disabled}
                  onChange={(e) => { setForm((f) => ({ ...f, extern_dienstleister: e.target.value })); setDirty(true); }} className={input} />
              </label>
              <label className={label}>
                Ablageort der Arbeitspapiere beim Dienstleister
                <input value={form.extern_ablage} disabled={disabled}
                  onChange={(e) => { setForm((f) => ({ ...f, extern_ablage: e.target.value })); setDirty(true); }} className={input} />
              </label>
            </div>
            <div className="rounded-md border border-copper-500/20 bg-copper-700/10 px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Zwei zulässige Betriebsarten.</strong> Variante A (Zielbild): der Dienstleister legt
              Arbeitsprogramm und Arbeitspapiere direkt hier ab. Variante B (Rückfallebene, unten): die Arbeitspapiere bleiben beim
              Dienstleister; das Institut führt stattdessen ein Einsichtsprotokoll — die schlechtere Lösung, weil sie die
              Nachvollziehbarkeit nur bezeugt statt selbst herzustellen.
            </div>

            <h4 className="text-[13px] font-semibold text-foreground">Einsichtnahme in die Arbeitspapiere des Dienstleisters</h4>
            {einsichten.length === 0 ? (
              <Banner tone="warn" title="Keine Einsichtnahme dokumentiert">
                Ohne Einsichtsnachweis kann das Institut nicht belegen, dass es seine fortbestehende Verantwortung für die
                ausgelagerte Prüfung wahrgenommen hat.
              </Banner>
            ) : (
              <div className="space-y-2">
                {einsichten.map((e) => (
                  <div key={e.id} className="rounded-md border border-border-subtle bg-graphite-900/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{e.datum}</span> · <span>{e.durch}</span>
                    </div>
                    {e.ergebnis && <p className="mt-1 text-foreground">{e.ergebnis}</p>}
                  </div>
                ))}
              </div>
            )}
            {canWrite && (addingEinsicht
              ? <EinsichtForm pruefungId={pruefungId} onDone={() => setAddingEinsicht(false)} />
              : <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingEinsicht(true)}>+ Einsichtnahme dokumentieren</Button>)}
          </>
        )}

        {canWrite && (
          <div className="flex items-center gap-3 pt-1">
            <Button className="px-3 py-1.5 text-xs" disabled={!dirty || pending} onClick={save}>{pending ? "Speichert…" : "Speichern"}</Button>
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
