"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addModellregisterEintrag, setModellStatus } from "@/app/(app)/risikomanagement/actions";
import type { Modellregister } from "@/lib/regstack/risikomanagement";

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

function ActionButton({ label, pendingLabel, onRun }: { label: string; pendingLabel: string; onRun: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        className="px-2.5 py-1 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await onRun();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

function ModellForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [zweck, setZweck] = useState("");
  const [istKiBasiert, setIstKiBasiert] = useState(false);
  const [erklaerbarkeitBewertung, setErklaerbarkeitBewertung] = useState("");
  const [ueberschreibungenBeschreibung, setUeberschreibungenBeschreibung] = useState("");
  const [naechsteValidierung, setNaechsteValidierung] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addModellregisterEintrag({ bezeichnung, zweck, istKiBasiert, erklaerbarkeitBewertung, ueberschreibungenBeschreibung, naechsteValidierung });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Modellbezeichnung" className={inputCls} disabled={pending} value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste Validierung
          <input type="date" value={naechsteValidierung} disabled={pending} onChange={(e) => setNaechsteValidierung(e.target.value)} className={`normal-case ${inputCls}`} />
        </label>
      </div>
      <textarea placeholder="Zweck / Anwendungsbereich" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={zweck} onChange={(e) => setZweck(e.target.value)} />
      <textarea placeholder="Erklärbarkeits-Bewertung" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={erklaerbarkeitBewertung} onChange={(e) => setErklaerbarkeitBewertung(e.target.value)} />
      <textarea placeholder="Überschreibungen — Prozess/Umfang" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={ueberschreibungenBeschreibung} onChange={(e) => setUeberschreibungenBeschreibung(e.target.value)} />
      <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={istKiBasiert} disabled={pending} onChange={(e) => setIstKiBasiert(e.target.checked)} />
        KI-/ML-basiertes Modell
      </label>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !bezeichnung.trim() || !zweck.trim()} onClick={submit}>{pending ? "Speichert…" : "Anlegen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function ModellregisterPanel({ modelle, canWrite }: { modelle: Modellregister[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="modellregister">
      <CardHeader>
        <CardTitle>Modellregister (AT 4.3.4)</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Modell</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Modellrisiko-Governance — Auswahl, Validierung, Erklärbarkeit und Überschreibungen, explizit
          inklusive KI-/ML-Modellen.
        </p>
        {adding && <div className="mb-3"><ModellForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {modelle.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch kein Modell erfasst.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {modelle.map((m) => (
              <div key={m.id} className="rounded-lg border border-border-subtle p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{m.bezeichnung}</span>
                    {m.istKiBasiert && <span className="rounded-full border border-copper-500/40 bg-copper-700/20 px-2 py-0.5 text-[10.5px] font-medium text-copper-300">KI/ML</span>}
                    <StatusPill status={m.status} />
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2">
                      {m.status === "in_entwicklung" && (
                        <ActionButton label="Als aktiv markieren" pendingLabel="Speichert…" onRun={() => setModellStatus(m.id, "aktiv")} />
                      )}
                      {m.status === "aktiv" && (
                        <ActionButton label="Außer Betrieb setzen" pendingLabel="Speichert…" onRun={() => setModellStatus(m.id, "ausser_betrieb")} />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed text-foreground">{m.zweck}</p>
                <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
                  {m.erklaerbarkeitBewertung && (
                    <div>
                      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite-500">Erklärbarkeit</div>
                      <p className="leading-relaxed text-foreground">{m.erklaerbarkeitBewertung}</p>
                    </div>
                  )}
                  {m.ueberschreibungenBeschreibung && (
                    <div>
                      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite-500">Überschreibungen</div>
                      <p className="leading-relaxed text-foreground">{m.ueberschreibungenBeschreibung}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {m.letzteValidierung && <span>Letzte Validierung: {m.letzteValidierung.slice(0, 10)}</span>}
                  {m.naechsteValidierung && <span>Nächste Validierung: {m.naechsteValidierung.slice(0, 10)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
