"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTS, MATERIALITY_OPTS } from "@/lib/regstack/revisions-universum";
import { addUniversumItem, type UniversumBasicInput } from "@/app/(app)/interne-revision/pruefungsuniversum/actions";

const emptyForm = (): UniversumBasicInput => ({
  bezeichnung: "", bereich: "", category: "sonstige", outsourced: false, materiality: "wesentlich",
  reg_anker: "", verantwortlicher_person_id: null, plan_year: new Date().getFullYear(),
});

function Form({ personen, onDone, onCancel }: { personen: { id: string; full_name: string }[]; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<UniversumBasicInput>(emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await addUniversumItem(form);
        onDone();
        router.push(`/interne-revision/pruefungsuniversum/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Bezeichnung des Prüfungsobjekts" value={form.bezeichnung} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))} className={`sm:col-span-2 ${input}`} />
        <input placeholder="Bereich" value={form.bereich ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bereich: e.target.value }))} className={input} />
        <select value={form.category ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={input}>
          {CATEGORY_OPTS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </select>
        <select value={form.materiality} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, materiality: e.target.value }))} className={input}>
          {MATERIALITY_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select value={form.verantwortlicher_person_id ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, verantwortlicher_person_id: e.target.value || null }))} className={input}>
          <option value="">— Verantwortlicher —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <input placeholder="Regulatorischer Anker (z. B. BTO 1.2 MaRisk; § 25a KWG)" value={form.reg_anker ?? ""} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, reg_anker: e.target.value }))} className={`sm:col-span-2 ${input}`} />
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={form.outsourced} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, outsourced: e.target.checked }))} />
          Ausgelagerte Tätigkeit
        </label>
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

export function UniversumAdd({ personen }: { personen: { id: string; full_name: string }[] }) {
  const [adding, setAdding] = useState(false);
  if (!adding) return <Button className="px-3 py-1.5 text-xs" onClick={() => setAdding(true)}>+ Neues Prüfungsobjekt</Button>;
  return <div className="mb-4"><Form personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>;
}
