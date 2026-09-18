"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateOrgForm, type OrgFormInput } from "@/app/(app)/interne-revision/governance/actions";

const ORG_FORM_OPTS: { v: string; label: string; ref: string; desc: string }[] = [
  { v: "eigene_einheit", label: "Eigene Revisionseinheit", ref: "Regelfall", desc: "Die Interne Revision ist als eigene, unabhängige Organisationseinheit eingerichtet." },
  { v: "geschaeftsleiter", label: "Aufgabenwahrnehmung durch einen Geschäftsleiter", ref: "nur bei sehr kleinen Instituten", desc: "Nur zulässig, wenn eine eigene Revisionseinheit unverhältnismäßig wäre und Maßnahmen zur Vermeidung von Interessenkonflikten dokumentiert sind." },
];

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-60";

export function OrgFormForm({
  initial, personen, canWrite,
}: {
  initial: OrgFormInput;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const disabled = !canWrite || pending;

  function update(patch: Partial<OrgFormInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateOrgForm(form);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Organisationsform</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Regelfall: eigene Revisionseinheit. Geschäftsleiter-geführte Interne Revision nur bei sehr
          kleinen Instituten, wenn eine eigene Einheit unverhältnismäßig wäre UND
          Interessenkonflikt-Maßnahmen implementiert sind. Tz. 1
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ORG_FORM_OPTS.map((o) => (
            <button
              key={o.v}
              type="button"
              disabled={disabled}
              onClick={() => update({ org_form: o.v })}
              className={`rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                form.org_form === o.v ? "border-copper-500 bg-copper-700/10" : "border-border-strong hover:border-copper-500/50"
              }`}
            >
              <div className="font-medium text-foreground">{o.label} <span className="text-xs font-normal text-muted-foreground">({o.ref})</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{o.desc}</p>
            </button>
          ))}
        </div>
        {form.org_form === "geschaeftsleiter" && (
          <div className="mt-3 space-y-3">
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Begründung der Unverhältnismäßigkeit einer eigenen Revisionseinheit
              <textarea rows={2} className={`${inputCls} normal-case`} disabled={disabled}
                value={form.disproportionality_reason ?? ""} onChange={(e) => update({ disproportionality_reason: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Maßnahmen zur Vermeidung von Interessenkonflikten
              <textarea rows={2} className={`${inputCls} normal-case`} disabled={disabled}
                value={form.conflict_measures ?? ""} onChange={(e) => update({ conflict_measures: e.target.value })} />
            </label>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Unterstellung und Unabhängigkeit</h3>
        <label className="mb-2 flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Leiter/in der Internen Revision
          <select className={inputCls} disabled={disabled} value={form.head_of_audit_person_id ?? ""}
            onChange={(e) => update({ head_of_audit_person_id: e.target.value || null })}>
            <option value="">— nicht benannt —</option>
            {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-copper-500" disabled={disabled} checked={form.direct_subordination}
            onChange={(e) => update({ direct_subordination: e.target.checked })} />
          Direkt der Geschäftsleitung unterstellt und berichtet an diese
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-copper-500" disabled={disabled} checked={form.independence_confirmed}
            onChange={(e) => update({ independence_confirmed: e.target.checked })} />
          Selbständige, unabhängige Aufgabenwahrnehmung bestätigt — keine Weisungen bei Wertung der
          Prüfungsergebnisse
        </label>
        <p className="mt-2 rounded-md border border-copper-500/30 bg-copper-700/10 px-3 py-2 text-xs text-copper-100">
          Das Direktionsrecht der Geschäftsleitung zur Anordnung zusätzlicher Prüfungen steht der
          Selbständigkeit und Unabhängigkeit nicht entgegen (Tz. 2 S.3) — solche Anordnungen werden
          unten protokolliert, nicht als Eingriff in die Unabhängigkeit gewertet.
        </p>
      </div>

      {canWrite && (
        <div className="flex items-center gap-2">
          <Button disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
          {saved && <span className="text-xs text-status-success">Gespeichert.</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
