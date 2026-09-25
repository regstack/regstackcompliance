"use client";

import { Fragment, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItProjekt, updateItProjekt, abschliessenItProjekt, abbrechenItProjekt } from "@/app/(app)/it-risiko/actions";
import type { ItProjekt } from "@/lib/regstack/it-risiko";

function ProjektForm({ initial, onDone, onCancel }: { initial?: ItProjekt; onDone: () => void; onCancel: () => void }) {
  const [bezeichnung, setBezeichnung] = useState(initial?.bezeichnung ?? "");
  const [ziel, setZiel] = useState(initial?.ziel ?? "");
  const [vorgehensmodell, setVorgehensmodell] = useState(initial?.vorgehensmodell ?? "");
  const [risikobewertung, setRisikobewertung] = useState(initial?.risikobewertung ?? "");
  const [startAm, setStartAm] = useState(initial?.startAm?.slice(0, 10) ?? "");
  const [geplantesEndeAm, setGeplantesEndeAm] = useState(initial?.geplantesEndeAm?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fields = { bezeichnung, ziel, vorgehensmodell, risikobewertung, startAm, geplantesEndeAm };
        if (initial) {
          await updateItProjekt(initial.id, fields);
        } else {
          await addItProjekt(fields);
        }
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Projektbezeichnung" value={bezeichnung} disabled={pending} onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Ziel" value={ziel} disabled={pending} rows={2} onChange={(e) => setZiel(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <input placeholder="Vorgehensmodell" value={vorgehensmodell} disabled={pending} onChange={(e) => setVorgehensmodell(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Risikobewertung" value={risikobewertung} disabled={pending} onChange={(e) => setRisikobewertung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Start
          <input type="date" value={startAm} disabled={pending} onChange={(e) => setStartAm(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Geplantes Ende
          <input type="date" value={geplantesEndeAm} disabled={pending} onChange={(e) => setGeplantesEndeAm(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !bezeichnung.trim()} onClick={submit}>
          {pending ? "Speichert…" : initial ? "Änderungen speichern" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function AbschliessenForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await abschliessenItProjekt(id, lessonsLearned);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Abschluss fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-1.5 rounded-md border border-border-strong bg-graphite-950 p-2">
      <textarea placeholder="Lessons Learned (Pflicht, Tz. 7.2)" value={lessonsLearned} disabled={pending} rows={2} onChange={(e) => setLessonsLearned(e.target.value)}
        className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      {error && <p className="mt-1 text-[11px] text-status-danger">{error}</p>}
      <div className="mt-1.5 flex gap-1.5">
        <Button className="px-2 py-1 text-[11px]" disabled={pending || !lessonsLearned.trim()} onClick={submit}>{pending ? "Speichert…" : "Abschließen"}</Button>
        <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ProjektAktionen({ item, canWrite, onEdit }: { item: ItProjekt; canWrite: boolean; onEdit: () => void }) {
  const [abschliessen, setAbschliessen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (item.status === "abgeschlossen" || item.status === "abgebrochen") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {!abschliessen ? (
        <div className="flex gap-1.5">
          {canWrite && <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={onEdit}>Bearbeiten</Button>}
          <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => setAbschliessen(true)}>Abschließen</Button>
          <Button
            variant="ghost"
            className="px-2 py-1 text-[11px]"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await abbrechenItProjekt(item.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
                }
              });
            }}
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <AbschliessenForm id={item.id} onDone={() => setAbschliessen(false)} />
      )}
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function ProjektPanel({ items, canWrite }: { items: ItProjekt[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="projekte">
      <CardHeader>
        <CardTitle>IT-Projekte</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => { setEditingId(null); setAdding(true); }}>+ Projekt</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">Portfolio-Steuerung von IT-Projekten inkl. Lessons Learned beim Abschluss (BAIT Kap. 7).</p>
        {adding && <div className="mb-3"><ProjektForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Projekt</th>
                <th className="px-3 py-2 font-medium">Geplantes Ende</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{p.bezeichnung}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.geplantesEndeAm?.slice(0, 10) ?? "—"}</td>
                    <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                    {canWrite && (
                      <td className="px-3 py-2 text-right">
                        <ProjektAktionen item={p} canWrite={canWrite} onEdit={() => { setAdding(false); setEditingId(editingId === p.id ? null : p.id); }} />
                      </td>
                    )}
                  </tr>
                  {editingId === p.id && (
                    <tr className="border-b border-border-subtle last:border-0">
                      <td colSpan={canWrite ? 4 : 3} className="px-3 py-2">
                        <ProjektForm initial={p} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 4 : 3} className="px-3 py-6 text-center text-muted-foreground">Noch keine IT-Projekte erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
