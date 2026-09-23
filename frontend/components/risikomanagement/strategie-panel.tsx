"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRisikostrategie, verabschiedeRisikostrategie, updateRisikostrategie } from "@/app/(app)/risikomanagement/actions";
import type { Risikostrategie, RmStrategieArt } from "@/lib/regstack/risikomanagement";
import { isOverdue } from "@/lib/regstack/compliance-utils";

const ART_LABELS: Record<RmStrategieArt, string> = {
  geschaeftsstrategie: "Geschäftsstrategie",
  risikostrategie: "Risikostrategie",
  teilstrategie: "Teilstrategie",
};

function StrategieForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [art, setArt] = useState<RmStrategieArt>("risikostrategie");
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [naechsteUeberpruefung, setNaechsteUeberpruefung] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRisikostrategie({ art, jahr, naechsteUeberpruefung });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={art} disabled={pending} onChange={(e) => setArt(e.target.value as RmStrategieArt)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          {(Object.keys(ART_LABELS) as RmStrategieArt[]).map((a) => <option key={a} value={a}>{ART_LABELS[a]}</option>)}
        </select>
        <input type="number" placeholder="Jahr" value={jahr} disabled={pending}
          onChange={(e) => setJahr(Number(e.target.value))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste Überprüfung
          <input type="date" value={naechsteUeberpruefung} disabled={pending} onChange={(e) => setNaechsteUeberpruefung(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Als Entwurf anlegen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// Nur solange status=entwurf möglich — das `inhalt`-JSON hat noch keinen eigenen Editor und
// bleibt hier bewusst ausgeklammert, analog zu updateItStrategie/updateRisikostrategie.
function NaechsteUeberpruefungEditForm({ strategie, onDone, onCancel }: { strategie: Risikostrategie; onDone: () => void; onCancel: () => void }) {
  const [naechsteUeberpruefung, setNaechsteUeberpruefung] = useState(strategie.naechsteUeberpruefung?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateRisikostrategie(strategie.id, naechsteUeberpruefung);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-2.5">
      <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        Nächste Überprüfung
        <input type="date" value={naechsteUeberpruefung} disabled={pending} onChange={(e) => setNaechsteUeberpruefung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
      </label>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function VerabschiedenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        className="px-2.5 py-1 text-xs"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await verabschiedeRisikostrategie(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Verabschiedung fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Verabschiedet…" : "Verabschieden"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function StrategiePanel({
  items, canWrite, canApprove,
}: {
  items: Risikostrategie[];
  canWrite: boolean;
  canApprove: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="strategien">
      <CardHeader>
        <CardTitle>Geschäfts- &amp; Risikostrategien</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Strategie</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Verabschiedung durch die Geschäftsleitung (AT 4.2) — Entwürfe können bearbeitet, verabschiedete Strategien nicht mehr geändert werden.
        </p>
        {adding && <div className="mb-3"><StrategieForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((s) => {
            const overdue = isOverdue(s.naechsteUeberpruefung ? s.naechsteUeberpruefung.slice(0, 10) : null);
            return (
              <div key={s.id} className={`rounded-lg border p-3.5 ${overdue ? "border-status-warning/40" : "border-border-subtle"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-graphite-500">{ART_LABELS[s.art]}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{ART_LABELS[s.art]} {s.jahr}</div>
                <div className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {s.status === "verabschiedet" && s.verabschiedetAm ? `Verabschiedet ${s.verabschiedetAm.slice(0, 10)}` : "Noch nicht verabschiedet"}
                  {s.naechsteUeberpruefung && <><br />Nächste Überprüfung: {s.naechsteUeberpruefung.slice(0, 10)}</>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill status={overdue ? "beendet" : s.status} label={overdue ? "Review fällig" : s.status} />
                </div>
                {s.status === "entwurf" && (canWrite || canApprove) && (
                  <div className="mt-2 flex items-center gap-2">
                    {canWrite && editingId !== s.id && (
                      <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditingId(s.id)}>Bearbeiten</Button>
                    )}
                    {canApprove && <VerabschiedenButton id={s.id} />}
                  </div>
                )}
                {editingId === s.id && (
                  <NaechsteUeberpruefungEditForm strategie={s} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                )}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Strategie erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
