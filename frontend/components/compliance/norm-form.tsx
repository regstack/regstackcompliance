"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addNorm, updateNorm, type NormInput } from "@/app/(app)/compliance/actions";

const WESENTLICHKEIT_OPTS = ["", "wesentlich", "nicht_wesentlich"];
const RISIKO_OPTS = ["", "hoch", "mittel", "gering"];

const emptyForm = (): NormInput => ({
  bezeichnung: "", quelle: "manuell", sachgebiet: "", relevanz: "relevant",
  relevanz_begruendung: "", wesentlichkeit: "", wesentlichkeit_begruendung: "", risiko: "",
});

export function NormForm({
  initial, id, onDone, onCancel,
}: {
  initial?: NormInput;
  id?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NormInput>(initial ?? emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (id) {
          await updateNorm(id, form);
          onDone();
        } else {
          const newId = await addNorm(form);
          onDone();
          router.push(`/compliance/normen/${newId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Bezeichnung der Regelung" value={form.bezeichnung} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))}
          aria-label="Bezeichnung der Regelung" className={`sm:col-span-2 ${input}`} />
        <input placeholder="Sachgebiet" value={form.sachgebiet} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, sachgebiet: e.target.value }))}
          aria-label="Sachgebiet" className={input} />
        <input placeholder="Quelle (z. B. manuell, Repository)" value={form.quelle} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, quelle: e.target.value }))}
          aria-label="Quelle (z. B. manuell, Repository)" className={input} />
        <select value={form.relevanz} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, relevanz: e.target.value as NormInput["relevanz"] }))}
          aria-label="Relevanz" className={input}>
          <option value="relevant">Stufe 1: relevant</option>
          <option value="nicht_relevant">Stufe 1: nicht relevant</option>
        </select>
        <select value={form.wesentlichkeit} disabled={pending || form.relevanz === "nicht_relevant"}
          onChange={(e) => setForm((f) => ({ ...f, wesentlichkeit: e.target.value }))}
          aria-label="Wesentlichkeit" className={input}>
          {WESENTLICHKEIT_OPTS.map((w) => <option key={w} value={w}>{w || "Stufe 2: —"}</option>)}
        </select>
        <textarea placeholder="Begründung Stufe 1 (Relevanz)" value={form.relevanz_begruendung} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, relevanz_begruendung: e.target.value }))}
          aria-label="Begründung Stufe 1 (Relevanz)" className={`sm:col-span-2 ${input}`} />
        {form.relevanz === "relevant" && (
          <textarea placeholder="Begründung Stufe 2 (Wesentlichkeit)" value={form.wesentlichkeit_begruendung} disabled={pending} rows={2}
            onChange={(e) => setForm((f) => ({ ...f, wesentlichkeit_begruendung: e.target.value }))}
            aria-label="Begründung Stufe 2 (Wesentlichkeit)" className={`sm:col-span-2 ${input}`} />
        )}
        <select value={form.risiko} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, risiko: e.target.value }))}
          aria-label="Risiko" className={input}>
          {RISIKO_OPTS.map((r) => <option key={r} value={r}>{r || "Risiko: —"}</option>)}
        </select>
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.bezeichnung.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}
