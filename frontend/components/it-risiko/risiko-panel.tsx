"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addItRisiko, acceptItRisiko } from "@/app/(app)/it-risiko/actions";
import type { ItAsset, ItRisiko } from "@/lib/regstack/it-risiko";

function RisikoForm({ assets, onDone, onCancel }: { assets: ItAsset[]; onDone: () => void; onCancel: () => void }) {
  const [assetId, setAssetId] = useState("");
  const [bedrohung, setBedrohung] = useState("");
  const [eintritt, setEintritt] = useState("");
  const [auswirkung, setAuswirkung] = useState("");
  const [restrisiko, setRestrisiko] = useState("");
  const [massnahme, setMassnahme] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addItRisiko({ assetId, bedrohung, eintrittswahrscheinlichkeit: eintritt, auswirkung, restrisiko, massnahme });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={assetId} disabled={pending} onChange={(e) => setAssetId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2">
          <option value="">— Asset (optional) —</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.bezeichnung}</option>)}
        </select>
        <input placeholder="Bedrohung" value={bedrohung} disabled={pending} onChange={(e) => setBedrohung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={eintritt} disabled={pending} onChange={(e) => setEintritt(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">Eintrittswahrsch. —</option>
          <option value="gering">gering</option><option value="mittel">mittel</option><option value="hoch">hoch</option>
        </select>
        <select value={auswirkung} disabled={pending} onChange={(e) => setAuswirkung(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">Auswirkung —</option>
          <option value="gering">gering</option><option value="mittel">mittel</option><option value="hoch">hoch</option><option value="kritisch">kritisch</option>
        </select>
        <select value={restrisiko} disabled={pending} onChange={(e) => setRestrisiko(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2">
          <option value="">Restrisiko —</option>
          <option value="gering">gering</option><option value="mittel">mittel</option><option value="hoch">hoch</option>
        </select>
        <textarea placeholder="Maßnahme" value={massnahme} disabled={pending} rows={2} onChange={(e) => setMassnahme(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !bedrohung.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function AcceptButton({ id }: { id: string }) {
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
              await acceptItRisiko(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Akzeptanz fehlgeschlagen.");
            }
          });
        }}
      >
        {pending ? "Akzeptiert…" : "Restrisiko akzeptieren"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export function RisikoPanel({
  items, assets, canWrite, canAccept,
}: {
  items: ItRisiko[];
  assets: ItAsset[];
  canWrite: boolean;
  canAccept: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card id="risiken">
      <CardHeader>
        <CardTitle>IT-Risikoregister</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Risiko</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Bedrohung → Maßnahme → Restrisiko je Asset. Verbleibendes hohes Restrisiko braucht die Akzeptanz der Geschäftsleitung.
        </p>
        {adding && <div className="mb-3"><RisikoForm assets={assets} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Bedrohung</th>
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Restrisiko</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{r.bedrohung}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.asset?.bezeichnung ?? "—"}</td>
                  <td className="px-3 py-2">{r.restrisiko ? <StatusPill status={r.restrisiko} /> : "—"}</td>
                  <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {canAccept && r.restrisiko === "hoch" && r.status !== "akzeptiert_von_gl" && r.status !== "geschlossen" && (
                      <AcceptButton id={r.id} />
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Noch keine IT-Risiken erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
