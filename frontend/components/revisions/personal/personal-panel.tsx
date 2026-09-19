"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertRevisionPersonal, type RevisionPersonalInput } from "@/app/(app)/interne-revision/personal/actions";

export type PersonalRow = {
  person_id: string;
  qualifikation: string | null;
  soll_fortbildung_tage: number;
  non_audit_tasks: string | null;
  advisory_active: boolean;
  advisory_safeguard: string | null;
  person: { full_name: string; org_unit: string | null } | null;
};

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50";

function PersonalRowForm({ row, canWrite }: { row: PersonalRow; canWrite: boolean }) {
  const initial: RevisionPersonalInput = {
    qualifikation: row.qualifikation,
    soll_fortbildung_tage: row.soll_fortbildung_tage,
    non_audit_tasks: row.non_audit_tasks,
    advisory_active: row.advisory_active,
    advisory_safeguard: row.advisory_safeguard,
  };
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = !canWrite || pending;

  function update(patch: Partial<RevisionPersonalInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertRevisionPersonal(row.person_id, form);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <tr className="border-b border-border-subtle last:border-0 align-top">
      <td className="px-3 py-2.5 font-medium text-foreground">{row.person?.full_name ?? "—"}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{row.person?.org_unit ?? "—"}</td>
      <td className="px-3 py-2.5">
        <input className={inputCls} disabled={disabled} value={form.non_audit_tasks ?? ""} placeholder="—"
          aria-label="Revisionsfremde Aufgabe"
          onChange={(e) => update({ non_audit_tasks: e.target.value || null })} />
      </td>
      <td className="px-3 py-2.5 text-center">
        <input type="checkbox" className="h-4 w-4 accent-copper-500" disabled={disabled} checked={form.advisory_active}
          aria-label="Beratend tätig"
          onChange={(e) => update({ advisory_active: e.target.checked })} />
      </td>
      <td className="px-3 py-2.5">
        <input className={inputCls} disabled={disabled || !form.advisory_active} value={form.advisory_safeguard ?? ""} placeholder="—"
          aria-label="Unabhängigkeits-Sicherung"
          onChange={(e) => update({ advisory_safeguard: e.target.value || null })} />
      </td>
      {canWrite && (
        <td className="px-3 py-2.5 text-right">
          {dirty && <Button className="px-2 py-1 text-xs" disabled={pending} onClick={save}>{pending ? "…" : "Speichern"}</Button>}
          {error && <div className="mt-1 text-[11px] text-status-danger">{error}</div>}
        </td>
      )}
    </tr>
  );
}

function AddPersonRow({ candidates, canWrite }: { candidates: { id: string; full_name: string }[]; canWrite: boolean }) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canWrite || candidates.length === 0) return null;

  function add() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await upsertRevisionPersonal(selected, {
          qualifikation: null, soll_fortbildung_tage: 0, non_audit_tasks: null, advisory_active: false, advisory_safeguard: null,
        });
        setSelected("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select className={`${inputCls} max-w-xs`} value={selected} disabled={pending} onChange={(e) => setSelected(e.target.value)} aria-label="Person auswählen">
        <option value="">— Person auswählen —</option>
        {candidates.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>
      <Button variant="secondary" className="px-2.5 py-1 text-xs" disabled={pending || !selected} onClick={add}>+ Mitarbeiter</Button>
      {error && <span className="text-xs text-status-danger">{error}</span>}
    </div>
  );
}

export function PersonalPanel({
  personal, allPersons, canWrite,
}: {
  personal: PersonalRow[];
  allPersons: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const existingIds = new Set(personal.map((p) => p.person_id));
  const candidates = allPersons.filter((p) => !existingIds.has(p.id));

  return (
    <Card>
      <CardHeader><CardTitle>Interne-Revision-Personal</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Tz. 3 — grundsätzlich keine revisionsfremden Aufgaben; beratende Tätigkeit nur, wenn die
          Unabhängigkeit gewahrt bleibt.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Funktion</th>
                <th className="px-3 py-2 font-medium">Revisionsfremde Aufgabe</th>
                <th className="px-3 py-2 font-medium">Beratend tätig</th>
                <th className="px-3 py-2 font-medium">Unabhängigkeits-Sicherung</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {personal.map((row) => <PersonalRowForm key={row.person_id} row={row} canWrite={canWrite} />)}
              {personal.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Noch kein Revisionspersonal erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <AddPersonRow candidates={candidates} canWrite={canWrite} />
      </CardBody>
    </Card>
  );
}
