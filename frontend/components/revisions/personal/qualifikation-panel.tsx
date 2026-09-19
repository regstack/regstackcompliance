"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  upsertRevisionPersonal, addRevisionSchulung, deleteRevisionSchulung,
  type RevisionPersonalInput, type SchulungInput,
} from "@/app/(app)/interne-revision/personal/actions";
import type { PersonalRow } from "./personal-panel";

export type SchulungRow = {
  id: string; person_id: string; titel: string; datum: string | null; umfang: number | null; nachweis_text: string | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50";

function QualifikationFields({ row, canWrite }: { row: PersonalRow; canWrite: boolean }) {
  const [form, setForm] = useState<Pick<RevisionPersonalInput, "qualifikation" | "soll_fortbildung_tage">>({
    qualifikation: row.qualifikation, soll_fortbildung_tage: row.soll_fortbildung_tage,
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = !canWrite || pending;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertRevisionPersonal(row.person_id, {
          ...form,
          non_audit_tasks: row.non_audit_tasks, advisory_active: row.advisory_active, advisory_safeguard: row.advisory_safeguard,
        });
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Qualifikation / fachlicher Schwerpunkt
        <input className={`${inputCls} min-w-[220px]`} disabled={disabled} value={form.qualifikation ?? ""}
          onChange={(e) => { setForm((f) => ({ ...f, qualifikation: e.target.value || null })); setDirty(true); }} />
      </label>
      <label className="flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Soll-Fortbildung pro Jahr (Tage)
        <input type="number" className={`${inputCls} w-28`} disabled={disabled} value={form.soll_fortbildung_tage}
          onChange={(e) => { setForm((f) => ({ ...f, soll_fortbildung_tage: Number(e.target.value) || 0 })); setDirty(true); }} />
      </label>
      {canWrite && dirty && <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={save}>{pending ? "…" : "Speichern"}</Button>}
      {error && <span className="text-xs text-status-danger">{error}</span>}
    </div>
  );
}

function AddSchulungForm({ personId, onDone }: { personId: string; onDone: () => void }) {
  const [form, setForm] = useState<SchulungInput>({ titel: "", datum: null, umfang: null, nachweis_text: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addRevisionSchulung(personId, form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <input placeholder="Fortbildung / Titel" className={inputCls} disabled={pending} value={form.titel}
          onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))} aria-label="Fortbildung / Titel" />
        <input type="date" className={inputCls} disabled={pending} value={form.datum ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value || null }))} aria-label="Datum" />
        <input type="number" placeholder="Tage" className={inputCls} disabled={pending} value={form.umfang ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, umfang: e.target.value === "" ? null : Number(e.target.value) }))} aria-label="Tage" />
        <input placeholder="Nachweis" className={inputCls} disabled={pending} value={form.nachweis_text ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nachweis_text: e.target.value }))} aria-label="Nachweis" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.titel.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function PersonCard({ row, schulungen, canWrite }: { row: PersonalRow; schulungen: SchulungRow[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [pendingDelete, startDelete] = useTransition();

  const ist = schulungen.reduce((n, s) => n + (Number(s.umfang) || 0), 0);
  const soll = Number(row.soll_fortbildung_tage) || 0;
  const quote = soll > 0 ? Math.round((100 * ist) / soll) : null;

  return (
    <div className="rounded-md border border-border-subtle p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{row.person?.full_name ?? "—"}{row.person?.org_unit ? ` — ${row.person.org_unit}` : ""}</span>
        {quote === null ? (
          <span className="text-xs text-muted-foreground">kein Soll hinterlegt</span>
        ) : (
          <StatusPill status={quote >= 100 ? "bestaetigt" : quote >= 60 ? "verbesserungsbeduerftig" : "beendet"} label={`${ist} von ${soll} Tagen (${quote} %)`} />
        )}
      </div>
      <QualifikationFields row={row} canWrite={canWrite} />
      {schulungen.length > 0 ? (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 font-medium">Fortbildung</th><th className="py-1.5 font-medium">Datum</th>
              <th className="py-1.5 font-medium">Tage</th><th className="py-1.5 font-medium">Nachweis</th>
              {canWrite && <th className="py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {schulungen.map((s) => (
              <tr key={s.id} className="border-b border-border-subtle last:border-0">
                <td className="py-1.5 text-foreground">{s.titel}</td>
                <td className="py-1.5 font-mono text-xs text-muted-foreground">{s.datum ?? "—"}</td>
                <td className="py-1.5 font-mono text-xs text-muted-foreground">{s.umfang ?? "—"}</td>
                <td className="py-1.5 text-xs text-muted-foreground">{s.nachweis_text || "— kein Nachweis"}</td>
                {canWrite && (
                  <td className="py-1.5 text-right">
                    <Button variant="ghost" className="px-2 py-0.5 text-xs text-status-danger" disabled={pendingDelete}
                      onClick={() => startDelete(async () => { await deleteRevisionSchulung(s.id); })}>
                      Löschen
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Keine Fortbildung erfasst.</p>
      )}
      {canWrite && !adding && <Button variant="secondary" className="mt-2 px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Fortbildung erfassen</Button>}
      {adding && <AddSchulungForm personId={row.person_id} onDone={() => setAdding(false)} />}
    </div>
  );
}

export function QualifikationPanel({
  personal, schulungen, canWrite,
}: {
  personal: PersonalRow[];
  schulungen: SchulungRow[];
  canWrite: boolean;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Qualifikation und Fortbildung</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Beantwortet eine in Prüfungen regelmäßig gestellte Frage: Ist die Interne Revision fachlich
          angemessen ausgestattet und hält sie ihre Kenntnisse aktuell?
        </p>
        {personal.map((row) => (
          <PersonCard key={row.person_id} row={row} schulungen={schulungen.filter((s) => s.person_id === row.person_id)} canWrite={canWrite} />
        ))}
        {personal.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Revisionspersonal erfasst.</p>}
      </CardBody>
    </Card>
  );
}
