"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import {
  AP_TYP, PRUEFUNGSHANDLUNG, AUSWAHLVERFAHREN, AP_REVIEW_OPTS, SCHRITT_BEURTEILUNG_OPTS,
  EMPTY_STICHPROBE, paperSelfReview, type Stichprobe,
} from "@/lib/regstack/revisions-universum";
import { Pill } from "@/components/revisions/pruefungen/pill";
import { updatePaper, deletePaper, type PaperInput } from "@/app/(app)/interne-revision/pruefungen/actions";
import { NachweisFileTable } from "@/components/nachweise/nachweis-file-table";
import { NachweisUploadForm } from "@/components/nachweise/nachweis-upload-form";
import type { Nachweis } from "@/lib/regstack/nachweise";

export type PaperRow = {
  id: string;
  nummer: string | null;
  titel: string;
  typ: string | null;
  handlung: string | null;
  inhalt: string | null;
  quelle: string | null;
  ersteller_person_id: string | null;
  erstellt_am: string | null;
  ergebnis: string | null;
  stichprobe: unknown;
  reviewer_person_id: string | null;
  review_am: string | null;
  review_status: string;
  review_kommentar: string | null;
  ersteller: { full_name: string } | null;
  reviewer: { full_name: string } | null;
};

const REVIEW_TONE: Record<string, "open" | "warning" | "success" | "danger"> = {
  in_arbeit: "open", vorgelegt: "warning", freigegeben: "success", nachbesserung: "danger",
};

export function PaperCard({
  paper, pruefungId, personen, nachweise, uploaderNames, canWrite,
}: {
  paper: PaperRow;
  pruefungId: string;
  personen: { id: string; full_name: string }[];
  nachweise: Nachweis[];
  uploaderNames: Record<string, string>;
  canWrite: boolean;
}) {
  const [form, setForm] = useState<PaperInput>({
    nummer: paper.nummer, titel: paper.titel, typ: paper.typ, handlung: paper.handlung, inhalt: paper.inhalt,
    quelle: paper.quelle, ersteller_person_id: paper.ersteller_person_id, erstellt_am: paper.erstellt_am,
    ergebnis: paper.ergebnis, stichprobe: { ...EMPTY_STICHPROBE, ...((paper.stichprobe as Partial<Stichprobe> | null) ?? {}) },
    reviewer_person_id: paper.reviewer_person_id, review_am: paper.review_am, review_status: paper.review_status,
    review_kommentar: paper.review_kommentar,
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingNachweis, setAddingNachweis] = useState(false);

  const disabled = !canWrite || pending;
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const self = paperSelfReview(form.reviewer_person_id, form.ersteller_person_id);
  const st = form.stichprobe;

  function set<K extends keyof PaperInput>(k: K, v: PaperInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  }
  function setSt<K extends keyof Stichprobe>(k: K, v: Stichprobe[K]) {
    setForm((f) => ({ ...f, stichprobe: { ...f.stichprobe, [k]: v } }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updatePaper(paper.id, pruefungId, form);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try { await deletePaper(paper.id, pruefungId); } catch (e) { setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen."); }
    });
  }

  const sampleRatio = Number(st.grundgesamtheitUmfang) > 0 && Number(st.stichprobenumfang) > 0
    ? Math.round((100 * Number(st.stichprobenumfang)) / Number(st.grundgesamtheitUmfang)) : null;

  return (
    <Card className="mt-2.5 px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{form.nummer || "—"} · {form.titel || "(ohne Titel)"}</span>
        <span className="flex items-center gap-1.5">
          {self && <Pill tone="danger">Vier-Augen verletzt</Pill>}
          <Pill tone={REVIEW_TONE[form.review_status] ?? "open"}>{AP_REVIEW_OPTS.find((o) => o.v === form.review_status)?.l ?? form.review_status}</Pill>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className={label}>Nummer<input value={form.nummer ?? ""} disabled={disabled} onChange={(e) => set("nummer", e.target.value)} className={input} /></label>
        <label className={label}>Typ
          <select value={form.typ ?? ""} disabled={disabled} onChange={(e) => set("typ", e.target.value)} className={input}>
            <option value="">—</option>{AP_TYP.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className={label}>Prüfungshandlung
          <select value={form.handlung ?? ""} disabled={disabled} onChange={(e) => set("handlung", e.target.value)} className={input}>
            <option value="">—</option>{PRUEFUNGSHANDLUNG.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>
      <label className={`mt-2 ${label}`}>Titel<input value={form.titel} disabled={disabled} onChange={(e) => set("titel", e.target.value)} className={input} /></label>
      <label className={`mt-2 ${label}`}>Vorgehen, Beobachtung, Schlussfolgerung
        <textarea value={form.inhalt ?? ""} disabled={disabled} rows={2} onChange={(e) => set("inhalt", e.target.value)} className={input} />
      </label>
      <label className={`mt-2 ${label}`}>Quelle des Nachweises <span className="normal-case font-normal">System, Ansprechpartner, Datum der Erhebung</span>
        <input value={form.quelle ?? ""} disabled={disabled} onChange={(e) => set("quelle", e.target.value)} className={input} />
      </label>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className={label}>Ersteller
          <select value={form.ersteller_person_id ?? ""} disabled={disabled} onChange={(e) => set("ersteller_person_id", e.target.value || null)} className={input}>
            <option value="">—</option>{personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </label>
        <label className={label}>Erstellt am<input type="date" value={form.erstellt_am ?? ""} disabled={disabled} onChange={(e) => set("erstellt_am", e.target.value || null)} className={input} /></label>
        <label className={label}>Ergebnis
          <select value={form.ergebnis ?? ""} disabled={disabled} onChange={(e) => set("ergebnis", e.target.value)} className={input}>
            {SCHRITT_BEURTEILUNG_OPTS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2.5 text-sm text-foreground">
        <input type="checkbox" checked={st.aktiv} disabled={disabled} onChange={(e) => setSt("aktiv", e.target.checked)} />
        Stichprobenprüfung
      </label>
      {st.aktiv && (
        <div className="mt-2 space-y-2 rounded-md border border-border-subtle bg-graphite-900/60 p-3">
          <label className={label}>Beschreibung der Grundgesamtheit
            <input value={st.grundgesamtheitBeschreibung} disabled={disabled} onChange={(e) => setSt("grundgesamtheitBeschreibung", e.target.value)} className={input} />
          </label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className={label}>Umfang Grundgesamtheit
              <input type="number" value={st.grundgesamtheitUmfang ?? ""} disabled={disabled} onChange={(e) => setSt("grundgesamtheitUmfang", e.target.value ? Number(e.target.value) : null)} className={input} />
            </label>
            <label className={label}>Auswahlverfahren
              <select value={st.verfahren} disabled={disabled} onChange={(e) => setSt("verfahren", e.target.value)} className={input}>
                {AUSWAHLVERFAHREN.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className={label}>Stichprobenumfang
              <input type="number" value={st.stichprobenumfang ?? ""} disabled={disabled} onChange={(e) => setSt("stichprobenumfang", e.target.value ? Number(e.target.value) : null)} className={input} />
              {sampleRatio !== null && <span className="text-[11px] font-normal normal-case text-muted-foreground">entspricht {sampleRatio} % der Grundgesamtheit</span>}
            </label>
          </div>
          <label className={label}>Quelle und Stichtag der Grundgesamtheit
            <input value={st.quelle} disabled={disabled} onChange={(e) => setSt("quelle", e.target.value)} className={input} />
          </label>
          <label className={label}>Begründung des Umfangs
            <textarea value={st.begruendung} disabled={disabled} rows={2} onChange={(e) => setSt("begruendung", e.target.value)} className={input} />
          </label>
          <label className={label}>Ersatzauswahl <span className="normal-case font-normal">ausgetauschte Elemente mit Begründung</span>
            <textarea value={st.ersatzauswahl} disabled={disabled} rows={2} onChange={(e) => setSt("ersatzauswahl", e.target.value)} className={input} />
          </label>
          <label className={label}>Einzelergebnisse je Element
            <textarea value={st.einzelergebnisse} disabled={disabled} rows={2} onChange={(e) => setSt("einzelergebnisse", e.target.value)} className={input} />
          </label>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nachweisdateien</h4>
        {canWrite && !addingNachweis && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setAddingNachweis(true)}>+ Datei</Button>
        )}
      </div>
      {addingNachweis && (
        <div className="mt-1.5">
          <NachweisUploadForm
            module="INTERNAL_AUDIT"
            entityType="arbeitspapier"
            entityId={paper.id}
            revalidateTargetPath={`/interne-revision/pruefungen/${pruefungId}`}
            onDone={() => setAddingNachweis(false)}
          />
        </div>
      )}
      <NachweisFileTable
        items={nachweise}
        module="INTERNAL_AUDIT"
        canWrite={canWrite}
        revalidateTargetPath={`/interne-revision/pruefungen/${pruefungId}`}
        uploaderNames={uploaderNames}
        compact
      />

      <div className="mt-3 rounded-md border border-border-subtle bg-graphite-900/60 p-3">
        <strong className="text-xs font-semibold text-foreground">Review und Freigabe</strong>
        <p className="mt-1 text-xs text-muted-foreground">
          Der Reviewer darf nicht der Ersteller sein. Mit der Freigabe wird das Arbeitspapier eingefroren.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className={label}>Reviewer
            <select value={form.reviewer_person_id ?? ""} disabled={disabled} onChange={(e) => set("reviewer_person_id", e.target.value || null)} className={input}>
              <option value="">—</option>{personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <label className={label}>Review am<input type="date" value={form.review_am ?? ""} disabled={disabled} onChange={(e) => set("review_am", e.target.value || null)} className={input} /></label>
          <label className={label}>Status
            <select value={form.review_status} disabled={disabled} onChange={(e) => set("review_status", e.target.value)} className={input}>
              {AP_REVIEW_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        </div>
        <label className={`mt-2 ${label}`}>
          Review-Kommentar{form.review_status === "nachbesserung" && <span className="normal-case font-normal text-status-danger"> — bei Nachbesserung erforderlich</span>}
          <textarea value={form.review_kommentar ?? ""} disabled={disabled} rows={2} onChange={(e) => set("review_kommentar", e.target.value)} className={input} />
        </label>
        {self && (
          <div className="mt-2">
            <Banner tone="crit" title="Reviewer und Ersteller sind identisch">
              Eine Freigabe durch dieselbe Person ist keine Freigabe — das Vier-Augen-Prinzip wird im Produktivsystem im
              Datenmodell erzwungen.
            </Banner>
          </div>
        )}
      </div>

      {canWrite && (
        <div className="mt-3 flex items-center gap-3">
          <Button className="px-2.5 py-1 text-xs" disabled={!dirty || pending} onClick={save}>{pending ? "Speichert…" : "Speichern"}</Button>
          <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={remove}>Arbeitspapier entfernen</Button>
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </Card>
  );
}
