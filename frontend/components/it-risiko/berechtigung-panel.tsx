"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addItBerechtigung,
  rezertifizierenItBerechtigung,
  deaktivierenItBerechtigung,
  entziehenItBerechtigung,
} from "@/app/(app)/it-risiko/actions";
import type { ItAsset, ItBerechtigung } from "@/lib/regstack/it-risiko";

function BerechtigungForm({ assets, onDone, onCancel }: { assets: ItAsset[]; onDone: () => void; onCancel: () => void }) {
  const [assetId, setAssetId] = useState("");
  const [benutzerBezeichnung, setBenutzerBezeichnung] = useState("");
  const [istTechnischerBenutzer, setIstTechnischerBenutzer] = useState(false);
  const [istPrivilegiert, setIstPrivilegiert] = useState(false);
  const [berechtigungsart, setBerechtigungsart] = useState("");
  const [needToKnowBegruendung, setNeedToKnowBegruendung] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItBerechtigung({ assetId, benutzerBezeichnung, istTechnischerBenutzer, istPrivilegiert, berechtigungsart, needToKnowBegruendung });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Benutzer / technischer Benutzer" value={benutzerBezeichnung} disabled={pending} onChange={(e) => setBenutzerBezeichnung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <input placeholder="Berechtigungsart / Rolle" value={berechtigungsart} disabled={pending} onChange={(e) => setBerechtigungsart(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={assetId} disabled={pending} onChange={(e) => setAssetId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2">
          <option value="">— Asset/System (optional) —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.bezeichnung}</option>)}
        </select>
        <textarea placeholder="Need-to-know-Begründung" value={needToKnowBegruendung} disabled={pending} rows={2} onChange={(e) => setNeedToKnowBegruendung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={istTechnischerBenutzer} disabled={pending} onChange={(e) => setIstTechnischerBenutzer(e.target.checked)} />
          Technischer Benutzer
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={istPrivilegiert} disabled={pending} onChange={(e) => setIstPrivilegiert(e.target.checked)} />
          Privilegiert (Tz. 6.7)
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !benutzerBezeichnung.trim() || !berechtigungsart.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function LifecycleActions({ item }: { item: ItBerechtigung }) {
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

  if (item.status === "entzogen") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(rezertifizierenItBerechtigung)}>
          Rezertifizieren
        </Button>
        {item.status === "aktiv" && (
          <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(deaktivierenItBerechtigung)}>
            Deaktivieren
          </Button>
        )}
        <Button variant="danger" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(entziehenItBerechtigung)}>
          Entziehen
        </Button>
      </div>
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function BerechtigungPanel({ items, assets, canWrite }: { items: ItBerechtigung[]; assets: ItAsset[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="berechtigungen">
      <CardHeader>
        <CardTitle>Berechtigungsmanagement</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Berechtigung</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Vergabe, Rezertifizierung und Entzug von Berechtigungen nach dem Need-to-know-/Least-Privilege-Prinzip (BAIT Kap. 6).
        </p>
        {adding && <div className="mb-3"><BerechtigungForm assets={assets} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Benutzer</th>
                <th className="px-3 py-2 font-medium">Berechtigungsart</th>
                <th className="px-3 py-2 font-medium">Nächste Rezertifizierung</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {b.benutzerBezeichnung}
                    {b.istTechnischerBenutzer && <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground">(technisch)</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {b.berechtigungsart}
                    {b.istPrivilegiert && <span className="ml-1.5"><StatusPill status="hoch" label="privilegiert" /></span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{b.naechsteRezertifizierung?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2"><StatusPill status={b.status} /></td>
                  {canWrite && <td className="px-3 py-2 text-right"><LifecycleActions item={b} /></td>}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={canWrite ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">Noch keine Berechtigungen erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
