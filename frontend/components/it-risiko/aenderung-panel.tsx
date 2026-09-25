"use client";

import { Fragment, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItAenderung, updateItAenderung, genehmigenItAenderung, umsetzenItAenderung, zurueckstellenItAenderung } from "@/app/(app)/it-risiko/actions";
import type { ItAenderung, ItAsset } from "@/lib/regstack/it-risiko";

function AenderungForm({
  assets, initial, onDone, onCancel,
}: {
  assets: ItAsset[];
  initial?: ItAenderung;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [assetId, setAssetId] = useState(initial?.assetId ?? "");
  const [bezeichnung, setBezeichnung] = useState(initial?.bezeichnung ?? "");
  const [art, setArt] = useState(initial?.art ?? "");
  const [risikobewertung, setRisikobewertung] = useState(initial?.risikobewertung ?? "");
  const [rueckabwicklungsplan, setRueckabwicklungsplan] = useState(initial?.rueckabwicklungsplan ?? "");
  const [geplantAm, setGeplantAm] = useState(initial?.geplantAm?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fields = { assetId, bezeichnung, art, risikobewertung, rueckabwicklungsplan, geplantAm };
        if (initial) {
          await updateItAenderung(initial.id, fields);
        } else {
          await addItAenderung(fields);
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
        <input placeholder="Bezeichnung der Änderung" value={bezeichnung} disabled={pending} onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={assetId} disabled={pending} onChange={(e) => setAssetId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">— Betroffenes Asset —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.bezeichnung}</option>)}
        </select>
        <input placeholder="Art (Patch, Hardwaretausch, …)" value={art} disabled={pending} onChange={(e) => setArt(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <textarea placeholder="Risikobewertung" value={risikobewertung} disabled={pending} rows={2} onChange={(e) => setRisikobewertung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Rückabwicklungsplan" value={rueckabwicklungsplan} disabled={pending} rows={2} onChange={(e) => setRueckabwicklungsplan(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Geplant am
          <input type="date" value={geplantAm} disabled={pending} onChange={(e) => setGeplantAm(e.target.value)}
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

function AenderungAktionen({ item, canWrite, onEdit }: { item: ItAenderung; canWrite: boolean; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  if (item.status === "umgesetzt") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {canWrite && <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={onEdit}>Bearbeiten</Button>}
        {item.status === "beantragt" && (
          <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(genehmigenItAenderung)}>Genehmigen</Button>
        )}
        {item.status === "genehmigt" && (
          <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(umsetzenItAenderung)}>Umsetzen</Button>
        )}
        {item.status !== "zurueckgestellt" && (
          <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(zurueckstellenItAenderung)}>Zurückstellen</Button>
        )}
      </div>
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function AenderungPanel({ items, assets, canWrite }: { items: ItAenderung[]; assets: ItAsset[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card id="aenderungen">
      <CardHeader>
        <CardTitle>Änderungsmanagement</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => { setEditingId(null); setAdding(true); }}>+ Änderung</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Beantragung, Genehmigung und Umsetzung von Änderungen an IT-Systemen inkl. Rückabwicklungsplan (BAIT Kap. 8).
        </p>
        {adding && <div className="mb-3"><AenderungForm assets={assets} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Änderung</th>
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Geplant am</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{a.bezeichnung}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.asset?.bezeichnung ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.geplantAm?.slice(0, 10) ?? "—"}</td>
                    <td className="px-3 py-2"><StatusPill status={a.status} /></td>
                    {canWrite && (
                      <td className="px-3 py-2 text-right">
                        <AenderungAktionen item={a} canWrite={canWrite} onEdit={() => { setAdding(false); setEditingId(editingId === a.id ? null : a.id); }} />
                      </td>
                    )}
                  </tr>
                  {editingId === a.id && (
                    <tr className="border-b border-border-subtle last:border-0">
                      <td colSpan={canWrite ? 5 : 4} className="px-3 py-2">
                        <AenderungForm assets={assets} initial={a} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">Noch keine Änderungen erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
