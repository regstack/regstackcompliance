"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRUEFUNGSHANDLUNG, SCHRITT_BEURTEILUNG_OPTS } from "@/lib/regstack/revisions-universum";
import { Pill } from "@/components/revisions/pruefungen/pill";
import { PaperCard, type PaperRow } from "@/components/revisions/pruefungen/paper-card";
import { updateSchritt, deleteSchritt, addPaper, type SchrittInput } from "@/app/(app)/interne-revision/pruefungen/actions";
import type { Nachweis } from "@/lib/regstack/nachweise";

export type SchrittRow = {
  id: string;
  nummer: number;
  bereich: string | null;
  handlung: string | null;
  risiko: string | null;
  soll_aussage: string | null;
  testschritte: string | null;
  ergebnis: string | null;
  beurteilung: string;
};

const BEURTEILUNG_TONE: Record<string, "open" | "warning" | "success"> = { ok: "success", feststellung: "warning", "": "open", nicht_pruefbar: "open" };

export function SchrittCard({
  schritt, pruefungId, papers, nachweiseByPaper, uploaderNames, personen, canWrite,
}: {
  schritt: SchrittRow;
  pruefungId: string;
  papers: PaperRow[];
  nachweiseByPaper: Record<string, Nachweis[]>;
  uploaderNames: Record<string, string>;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [form, setForm] = useState<SchrittInput>({
    nummer: schritt.nummer, bereich: schritt.bereich, handlung: schritt.handlung, risiko: schritt.risiko,
    soll_aussage: schritt.soll_aussage, testschritte: schritt.testschritte, ergebnis: schritt.ergebnis, beurteilung: schritt.beurteilung,
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disabled = !canWrite || pending;
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const beurt = SCHRITT_BEURTEILUNG_OPTS.find((b) => b.v === form.beurteilung) ?? SCHRITT_BEURTEILUNG_OPTS[0];

  function set<K extends keyof SchrittInput>(k: K, v: SchrittInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateSchritt(schritt.id, pruefungId, form);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try { await deleteSchritt(schritt.id, pruefungId); } catch (e) { setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen."); }
    });
  }

  function addPaperRow() {
    startTransition(async () => {
      try { await addPaper(schritt.id, pruefungId); } catch (e) { setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen."); }
    });
  }

  return (
    <Card className="mt-3 px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{form.nummer || "—"} · {form.bereich || "(Bereich)"}</span>
        <span className="flex items-center gap-1.5">
          <Pill tone={BEURTEILUNG_TONE[form.beurteilung] ?? "open"}>{beurt.l}</Pill>
          <Pill tone="open">{papers.length} AP</Pill>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className={label}>Nummer<input type="number" value={form.nummer} disabled={disabled} onChange={(e) => set("nummer", Number(e.target.value))} className={input} /></label>
        <label className={label}>Bereich<input value={form.bereich ?? ""} disabled={disabled} onChange={(e) => set("bereich", e.target.value)} className={input} /></label>
        <label className={label}>Prüfungshandlung
          <select value={form.handlung ?? ""} disabled={disabled} onChange={(e) => set("handlung", e.target.value)} className={input}>
            <option value="">—</option>{PRUEFUNGSHANDLUNG.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>
      <label className={`mt-2 ${label}`}>Geprüftes Risiko<textarea value={form.risiko ?? ""} disabled={disabled} rows={2} onChange={(e) => set("risiko", e.target.value)} className={input} /></label>
      <label className={`mt-2 ${label}`}>Soll-Aussage <span className="normal-case font-normal">was gelten müsste, wenn alles in Ordnung ist</span>
        <textarea value={form.soll_aussage ?? ""} disabled={disabled} rows={2} onChange={(e) => set("soll_aussage", e.target.value)} className={input} />
      </label>
      <label className={`mt-2 ${label}`}>Testschritte<textarea value={form.testschritte ?? ""} disabled={disabled} rows={2} onChange={(e) => set("testschritte", e.target.value)} className={input} /></label>
      <label className={`mt-2 ${label}`}>Ergebnis (Ist-Feststellung)<textarea value={form.ergebnis ?? ""} disabled={disabled} rows={2} onChange={(e) => set("ergebnis", e.target.value)} className={input} /></label>
      <label className={`mt-2 ${label}`}>Beurteilung
        <select value={form.beurteilung} disabled={disabled} onChange={(e) => set("beurteilung", e.target.value)} className={input}>
          {SCHRITT_BEURTEILUNG_OPTS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
        </select>
      </label>

      {canWrite && (
        <div className="mt-3 flex items-center gap-3">
          <Button className="px-2.5 py-1 text-xs" disabled={!dirty || pending} onClick={save}>{pending ? "Speichert…" : "Speichern"}</Button>
          <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={remove}>Schritt entfernen</Button>
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}

      <div className="mt-3 rounded-md border border-border-subtle bg-graphite-900/60 p-3">
        <strong className="text-xs font-semibold text-foreground">Arbeitspapiere zu diesem Schritt</strong>
        {papers.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Noch kein Arbeitspapier erfasst.</p>}
        {papers.map((p) => (
          <PaperCard key={p.id} paper={p} pruefungId={pruefungId} personen={personen} nachweise={nachweiseByPaper[p.id] ?? []} uploaderNames={uploaderNames} canWrite={canWrite} />
        ))}
        {canWrite && <Button className="mt-3 px-2.5 py-1 text-xs" disabled={pending} onClick={addPaperRow}>+ Arbeitspapier</Button>}
      </div>
    </Card>
  );
}
