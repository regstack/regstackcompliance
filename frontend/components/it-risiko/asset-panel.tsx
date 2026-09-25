"use client";

import { Fragment, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItAsset, updateItAsset } from "@/app/(app)/it-risiko/actions";
import type { ItAsset, ItSchutzbedarf } from "@/lib/regstack/it-risiko";
import { IT_ASSET_KATEGORIE_LABELS, type ItAssetKategorie } from "@/lib/regstack/it-risiko-labels";

const KATEGORIEN = Object.keys(IT_ASSET_KATEGORIE_LABELS) as ItAssetKategorie[];
const SCHUTZBEDARF: ItSchutzbedarf[] = ["normal", "hoch", "sehr_hoch"];

function SchutzbedarfPill({ value }: { value: ItSchutzbedarf | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const status = value === "normal" ? "gering" : value === "hoch" ? "mittel" : "hoch";
  return <StatusPill status={status} label={value.replace("_", " ")} />;
}

function AssetForm({ initial, onDone, onCancel }: { initial?: ItAsset; onDone: () => void; onCancel: () => void }) {
  const [bezeichnung, setBezeichnung] = useState(initial?.bezeichnung ?? "");
  const [kategorie, setKategorie] = useState<ItAssetKategorie>(initial?.kategorie ?? KATEGORIEN[0]);
  const [c, setC] = useState<ItSchutzbedarf | "">(initial?.schutzbedarfVertraulichkeit ?? "");
  const [i, setI] = useState<ItSchutzbedarf | "">(initial?.schutzbedarfIntegritaet ?? "");
  const [a, setA] = useState<ItSchutzbedarf | "">(initial?.schutzbedarfVerfuegbarkeit ?? "");
  const [begruendung, setBegruendung] = useState(initial?.begruendung ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fields = {
          bezeichnung, kategorie,
          schutzbedarfVertraulichkeit: c, schutzbedarfIntegritaet: i, schutzbedarfVerfuegbarkeit: a,
          begruendung,
        };
        if (initial) {
          await updateItAsset(initial.id, fields);
        } else {
          await addItAsset(fields);
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
        <input placeholder="Asset-Bezeichnung" value={bezeichnung} disabled={pending} onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={kategorie} disabled={pending} onChange={(e) => setKategorie(e.target.value as ItAssetKategorie)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2">
          {KATEGORIEN.map((k) => <option key={k} value={k}>{IT_ASSET_KATEGORIE_LABELS[k]}</option>)}
        </select>
        {[
          { label: "Vertraulichkeit", value: c, set: setC },
          { label: "Integrität", value: i, set: setI },
          { label: "Verfügbarkeit", value: a, set: setA },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
            <select value={value} disabled={pending} onChange={(e) => set(e.target.value as ItSchutzbedarf | "")}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50">
              <option value="">—</option>
              {SCHUTZBEDARF.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </label>
        ))}
        <textarea placeholder="Begründung" value={begruendung} disabled={pending} rows={2} onChange={(e) => setBegruendung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
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

export function AssetPanel({ items, canWrite }: { items: ItAsset[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="assets">
      <CardHeader>
        <CardTitle>Schutzbedarfsfeststellung</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => { setEditingId(null); setAdding(true); }}>+ Asset</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">Asset-Register mit Schutzbedarf für Vertraulichkeit, Integrität und Verfügbarkeit (BAIT Kap. 3).</p>
        {adding && <div className="mb-3"><AssetForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Kategorie</th>
                <th className="px-3 py-2 font-medium">Vertraulichkeit</th>
                <th className="px-3 py-2 font-medium">Integrität</th>
                <th className="px-3 py-2 font-medium">Verfügbarkeit</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <Fragment key={asset.id}>
                  <tr className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{asset.bezeichnung}</td>
                    <td className="px-3 py-2 text-muted-foreground">{IT_ASSET_KATEGORIE_LABELS[asset.kategorie]}</td>
                    <td className="px-3 py-2"><SchutzbedarfPill value={asset.schutzbedarfVertraulichkeit} /></td>
                    <td className="px-3 py-2"><SchutzbedarfPill value={asset.schutzbedarfIntegritaet} /></td>
                    <td className="px-3 py-2"><SchutzbedarfPill value={asset.schutzbedarfVerfuegbarkeit} /></td>
                    {canWrite && (
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={adding} onClick={() => { setAdding(false); setEditingId(editingId === asset.id ? null : asset.id); }}>
                          Bearbeiten
                        </Button>
                      </td>
                    )}
                  </tr>
                  {editingId === asset.id && (
                    <tr className="border-b border-border-subtle last:border-0">
                      <td colSpan={canWrite ? 6 : 5} className="px-3 py-2">
                        <AssetForm initial={asset} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">Noch keine IT-Assets erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
