"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { QS_STATUS_OPTS, type QsChecklistItem } from "@/lib/regstack/revisions-universum";
import { Pill } from "@/components/revisions/pruefungen/pill";
import { updateQsChecklist, resetQsChecklist, updateQsMeta, type QsMetaInput } from "@/app/(app)/interne-revision/pruefungen/actions";

const STATUS_TONE: Record<string, "open" | "success" | "warning" | "danger"> = {
  offen: "open", erfuellt: "success", teilweise: "warning", nicht_erfuellt: "danger", na: "open",
};

export function QsPanel({
  pruefungId, checklist, meta, personen, canWrite,
}: {
  pruefungId: string;
  checklist: QsChecklistItem[];
  meta: QsMetaInput;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [list, setList] = useState<QsChecklistItem[]>(checklist);
  const [metaForm, setMetaForm] = useState<QsMetaInput>(meta);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disabled = !canWrite || pending;
  const input = "rounded-md border border-border-strong bg-surface px-2 py-1 text-xs normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const open = list.filter((q) => q.status === "offen").length;
  const notMet = list.filter((q) => q.status === "nicht_erfuellt" || q.status === "teilweise").length;

  function patch(id: string, p: Partial<QsChecklistItem>) {
    setList((cur) => cur.map((q) => (q.id === id ? { ...q, ...p } : q)));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateQsChecklist(pruefungId, list);
        await updateQsMeta(pruefungId, metaForm);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function reset() {
    startTransition(async () => {
      try {
        await resetQsChecklist(pruefungId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Zurücksetzen fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Qualitätscheckliste zur Prüfung</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-4 text-xs text-muted-foreground">
          Tz. 1 S.2 — Planung, Methoden und Qualität der Revisionsarbeit sind regelmäßig und anlassbezogen zu überprüfen.
          Diese Checkliste ist die prüfungsbezogene Ebene dazu; die institutsweite Überprüfung liegt unter „Governance,
          QS &amp; Projekte&ldquo;.
        </p>

        {list.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-graphite-900/60 px-3 py-2 text-xs text-muted-foreground">
            Für diese Prüfung wurde noch keine Qualitätscheckliste angelegt.
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <StatCard label="Punkte" value={list.length} hint="in der Checkliste" />
              <StatCard label="Offen" value={open} tone={open ? "warn" : "good"} hint="noch nicht beurteilt" />
              <StatCard label="Nicht/teilweise erfüllt" value={notMet} tone={notMet ? "warn" : "good"} hint="mit Begründungspflicht" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Punkt</th>
                    <th className="px-3 py-2 font-medium">Bezug</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Begründung / Kommentar</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((q) => {
                    const needsComment = q.status !== "erfuellt" && q.status !== "na" && !q.kommentar;
                    return (
                      <tr key={q.id} className="border-b border-border-subtle last:border-0 align-top">
                        <td className="px-3 py-2.5 text-foreground">{q.punkt}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{q.tz}</td>
                        <td className="px-3 py-2.5">
                          <select value={q.status} disabled={disabled} onChange={(e) => patch(q.id, { status: e.target.value as QsChecklistItem["status"] })} className={input} aria-label={`Status: ${q.punkt}`}>
                            {QS_STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          <div className="mt-1"><Pill tone={STATUS_TONE[q.status]}>{QS_STATUS_OPTS.find((o) => o.v === q.status)?.l}</Pill></div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input value={q.kommentar} disabled={disabled} placeholder={needsComment ? "Begründung erforderlich" : "—"}
                            onChange={(e) => patch(q.id, { kommentar: e.target.value })} className={`w-full ${input}`} aria-label={`Begründung / Kommentar: ${q.punkt}`} />
                          {needsComment && <div className="mt-1 text-[11px] text-status-danger">Jede Bewertung außer „erfüllt&ldquo; ist zu begründen.</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <label className={label}>Ausgefüllt durch
                <select value={metaForm.qs_completed_by ?? ""} disabled={disabled}
                  onChange={(e) => { setMetaForm((f) => ({ ...f, qs_completed_by: e.target.value || null })); setDirty(true); }} className={input}>
                  <option value="">—</option>{personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
              <label className={label}>Ausgefüllt am
                <input type="date" value={metaForm.qs_completed_at ?? ""} disabled={disabled}
                  onChange={(e) => { setMetaForm((f) => ({ ...f, qs_completed_at: e.target.value || null })); setDirty(true); }} className={input} />
              </label>
              <label className={label}>Geprüft durch (QS)
                <select value={metaForm.qs_reviewed_by ?? ""} disabled={disabled}
                  onChange={(e) => { setMetaForm((f) => ({ ...f, qs_reviewed_by: e.target.value || null })); setDirty(true); }} className={input}>
                  <option value="">—</option>{personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
              <label className={label}>Geprüft am
                <input type="date" value={metaForm.qs_reviewed_at ?? ""} disabled={disabled}
                  onChange={(e) => { setMetaForm((f) => ({ ...f, qs_reviewed_at: e.target.value || null })); setDirty(true); }} className={input} />
              </label>
            </div>
          </>
        )}

        {canWrite && (
          <div className="mt-4 flex items-center gap-3">
            {list.length > 0 && <Button className="px-2.5 py-1.5 text-xs" disabled={!dirty || pending} onClick={save}>{pending ? "Speichert…" : "Speichern"}</Button>}
            <Button variant="secondary" className="px-2.5 py-1.5 text-xs" disabled={pending} onClick={reset}>
              {list.length ? "Checkliste zurücksetzen" : "Checkliste aus Vorlage anlegen"}
            </Button>
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
