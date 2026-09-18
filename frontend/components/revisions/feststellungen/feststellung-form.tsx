"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SEVERITY_ORDER, severityLabel } from "@/lib/regstack/revisions-utils";
import { createFeststellung, type FeststellungInput } from "@/app/(app)/interne-revision/feststellungen/actions";

type Pruefung = { id: string; subject: string; pruefungsobjekt: { bezeichnung: string } | null };
type Person = { id: string; full_name: string };

const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

const emptyForm = (): FeststellungInput => ({
  pruefung_id: "",
  titel: "",
  beschreibung: "",
  schweregrad: "wesentlich",
  frist_urspruenglich: null,
  verantwortlich_person_id: null,
  executive_target: false,
});

export function FeststellungForm({
  pruefungen, personen, onDone, onCancel,
}: {
  pruefungen: Pruefung[];
  personen: Person[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FeststellungInput>(emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createFeststellung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const canSubmit = form.pruefung_id && form.titel.trim() && !pending;

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <p className="mb-2 text-[11px] text-muted-foreground">
        Eine Feststellung entsteht immer innerhalb einer konkreten Prüfung — das Prüfungsobjekt wird
        daraus übernommen, nicht separat gewählt.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={form.pruefung_id}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, pruefung_id: e.target.value }))}
          className={`sm:col-span-2 ${input}`}
        >
          <option value="">— Prüfung wählen —</option>
          {pruefungen.map((p) => (
            <option key={p.id} value={p.id}>
              {p.subject}{p.pruefungsobjekt ? ` (${p.pruefungsobjekt.bezeichnung})` : ""}
            </option>
          ))}
        </select>

        <input
          placeholder="Titel der Feststellung"
          value={form.titel}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
          className={`sm:col-span-2 ${input}`}
        />

        <textarea
          placeholder="Beschreibung"
          rows={2}
          value={form.beschreibung}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
          className={`sm:col-span-2 ${input}`}
        />

        <select
          value={form.schweregrad}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, schweregrad: e.target.value }))}
          className={input}
        >
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>{severityLabel(s)}</option>
          ))}
        </select>

        <select
          value={form.verantwortlich_person_id ?? ""}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, verantwortlich_person_id: e.target.value || null }))}
          className={input}
        >
          <option value="">— Verantwortlich —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>

        <div className="field">
          <label className="mb-1 block text-[11px] text-muted-foreground">
            Ursprüngliche Frist <span className="text-copper-300">(danach unveränderlich)</span>
          </label>
          <input
            type="date"
            value={form.frist_urspruenglich ?? ""}
            disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, frist_urspruenglich: e.target.value || null }))}
            className={input}
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={form.executive_target}
            disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, executive_target: e.target.checked }))}
          />
          Richtet sich gegen einen Geschäftsleiter (Tz. 8)
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={!canSubmit} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}
