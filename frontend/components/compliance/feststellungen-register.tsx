"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  setFeststellungFachbereichErledigt, setFeststellungWirksamkeitBestaetigt,
  setFeststellungGeschlossen, setFeststellungAkzeptiertesRisiko,
} from "@/app/(app)/compliance/actions";

type Feststellung = {
  id: string; norm_id: string | null; titel: string; beschreibung: string | null; status: string;
  schweregrad: string | null; frist: string | null; massnahme: string | null; quelle: string | null;
  verantwortlich: { full_name: string } | null; normen: { bezeichnung: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen", fachbereich_erledigt: "Erledigt gemeldet — Prüfung aussteht",
  wirksamkeit_bestaetigt: "Wirksamkeit bestätigt", geschlossen: "Geschlossen",
  akzeptiertes_risiko: "Akzeptiertes Risiko",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "alle", label: "Alle" }, { key: "offen", label: "Offen" },
  { key: "fachbereich_erledigt", label: "Erledigt gemeldet" },
  { key: "wirksamkeit_bestaetigt", label: "Wirksamkeit bestätigt" },
  { key: "geschlossen", label: "Geschlossen" }, { key: "akzeptiertes_risiko", label: "Akzeptiertes Risiko" },
];

function isOverdue(frist: string | null) {
  if (!frist) return false;
  return frist < new Date().toISOString().slice(0, 10);
}

function Row({ f, canWrite }: { f: Feststellung; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ueberpruefung, setUeberpruefung] = useState("");
  const overdue = f.status !== "geschlossen" && f.status !== "akzeptiertes_risiko" && isOverdue(f.frist);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen."); }
    });
  }

  return (
    <tr className="border-b border-border-subtle last:border-0 align-top">
      <td className="px-3 py-2.5">
        <div className="font-medium text-foreground">{f.titel}</div>
        {f.normen && (
          <Link href={`/compliance/normen/${f.norm_id}`} className="text-xs text-muted-foreground hover:text-copper-300">
            {f.normen.bezeichnung}
          </Link>
        )}
        {f.quelle && <div className="mt-0.5 text-[11px] text-muted-foreground">Quelle: {f.quelle}</div>}
      </td>
      <td className="px-3 py-2.5">{f.schweregrad && <StatusPill status={f.schweregrad} />}</td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {f.massnahme}
        {f.verantwortlich && <div className="mt-0.5 text-xs">Verantwortlich: {f.verantwortlich.full_name}</div>}
      </td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{f.frist ?? "—"}</span>
        {overdue && <div className="mt-1"><StatusPill status="beendet" label="überfällig" /></div>}
      </td>
      <td className="px-3 py-2.5"><StatusPill status={f.status} label={STATUS_LABEL[f.status] ?? f.status} /></td>
      <td className="px-3 py-2.5">
        {canWrite && (
          <div className="flex flex-col gap-1.5">
            {f.status === "offen" && (
              <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungFachbereichErledigt(f.id, f.norm_id ?? ""))}>
                Als erledigt gemeldet markieren
              </Button>
            )}
            {f.status === "fachbereich_erledigt" && (
              <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungWirksamkeitBestaetigt(f.id, f.norm_id ?? ""))}>
                Wirksamkeit bestätigen
              </Button>
            )}
            {f.status === "wirksamkeit_bestaetigt" && (
              <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungGeschlossen(f.id, f.norm_id ?? ""))}>
                Schließen
              </Button>
            )}
            {(f.status === "offen" || f.status === "fachbereich_erledigt") && (
              <div className="flex items-center gap-1">
                <input type="date" value={ueberpruefung} onChange={(e) => setUeberpruefung(e.target.value)}
                  aria-label="Überprüfung am"
                  className="w-28 rounded-md border border-border-strong bg-surface px-1.5 py-1 text-[11px] text-foreground" />
                <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending || !ueberpruefung}
                  onClick={() => run(() => setFeststellungAkzeptiertesRisiko(f.id, f.norm_id ?? "", ueberpruefung))}>
                  Risiko akzeptieren
                </Button>
              </div>
            )}
            {error && <p className="text-xs text-status-danger">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}

export function FeststellungenRegister({ feststellungen, canWrite }: { feststellungen: Feststellung[]; canWrite: boolean }) {
  const [filter, setFilter] = useState("alle");
  const rows = filter === "alle" ? feststellungen : feststellungen.filter((f) => f.status === filter);

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f.key ? "border-copper-500 bg-copper-500/10 text-copper-300" : "border-border-strong text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Feststellung / Regelung</th>
                <th className="px-3 py-2 font-medium">Schweregrad</th>
                <th className="px-3 py-2 font-medium">Maßnahme</th>
                <th className="px-3 py-2 font-medium">Frist</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => <Row key={f.id} f={f} canWrite={canWrite} />)}
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Keine Feststellungen in diesem Filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
