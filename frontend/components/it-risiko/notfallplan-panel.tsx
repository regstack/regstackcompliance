"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItNotfallplan, freigebenItNotfallplan, addItNotfalltest } from "@/app/(app)/it-risiko/actions";
import type { ItAsset, ItNotfallplan } from "@/lib/regstack/it-risiko";

function NotfallplanForm({ assets, onDone, onCancel }: { assets: ItAsset[]; onDone: () => void; onCancel: () => void }) {
  const [assetId, setAssetId] = useState("");
  const [bezeichnung, setBezeichnung] = useState("");
  const [rto, setRto] = useState("");
  const [rpo, setRpo] = useState("");
  const [konfigurationNotbetrieb, setKonfigurationNotbetrieb] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItNotfallplan({ assetId, bezeichnung, rto, rpo, konfigurationNotbetrieb });
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
        <select value={assetId} disabled={pending} onChange={(e) => setAssetId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2">
          <option value="">— Zeitkritisches Asset/System —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.bezeichnung}</option>)}
        </select>
        <input placeholder="RTO (z. B. 4 Stunden)" value={rto} disabled={pending} onChange={(e) => setRto(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="RPO (z. B. 15 Minuten)" value={rpo} disabled={pending} onChange={(e) => setRpo(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <textarea placeholder="Konfiguration für den Notbetrieb" value={konfigurationNotbetrieb} disabled={pending} rows={2} onChange={(e) => setKonfigurationNotbetrieb(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !bezeichnung.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function TestForm({ planId, onDone, onCancel }: { planId: string; onDone: () => void; onCancel: () => void }) {
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [ergebnis, setErgebnis] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItNotfalltest(planId, ergebnis, datum);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-1.5 rounded-md border border-border-strong bg-graphite-950 p-2">
      <div className="grid gap-1.5 sm:grid-cols-2">
        <input type="date" value={datum} disabled={pending} onChange={(e) => setDatum(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Ergebnis" value={ergebnis} disabled={pending} onChange={(e) => setErgebnis(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
      </div>
      {error && <p className="mt-1 text-[11px] text-status-danger">{error}</p>}
      <div className="mt-1.5 flex gap-1.5">
        <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Test erfassen"}</Button>
        <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function PlanAktionen({ item, canWrite }: { item: ItNotfallplan; canWrite: boolean }) {
  const [testing, setTesting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canWrite) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {!testing ? (
        <div className="flex gap-1.5">
          {item.status === "entwurf" && (
            <Button
              variant="secondary"
              className="px-2 py-1 text-[11px]"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await freigebenItNotfallplan(item.id);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
                  }
                });
              }}
            >
              Freigeben
            </Button>
          )}
          <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => setTesting(true)}>+ Test</Button>
        </div>
      ) : (
        <TestForm planId={item.id} onDone={() => setTesting(false)} onCancel={() => setTesting(false)} />
      )}
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function NotfallplanPanel({ items, assets, canWrite }: { items: ItNotfallplan[]; assets: ItAsset[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="notfallmanagement">
      <CardHeader>
        <CardTitle>IT-Notfallmanagement</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Notfallplan</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Wiederanlauf-/Notbetriebspläne je zeitkritischem System mit mindestens jährlichem Wirksamkeitstest (BAIT Kap. 10).
        </p>
        {adding && <div className="mb-3"><NotfallplanForm assets={assets} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Notfallplan</th>
                <th className="px-3 py-2 font-medium">RTO / RPO</th>
                <th className="px-3 py-2 font-medium">Letzter Test</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {p.bezeichnung}
                    {p.asset && <div className="text-[11px] font-normal text-muted-foreground">{p.asset.bezeichnung}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.rto ?? "—"} / {p.rpo ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.letzterTestAm?.slice(0, 10) ?? "noch kein Test"}</td>
                  <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                  {canWrite && <td className="px-3 py-2 text-right"><PlanAktionen item={p} canWrite={canWrite} /></td>}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">Noch keine IT-Notfallpläne erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
