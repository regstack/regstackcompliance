"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { upsertGovernanceSettings, type GovernanceSettingsInput } from "@/app/(app)/compliance/actions";

export function GovernanceSettingsForm({ initial, canWrite }: { initial: GovernanceSettingsInput; canWrite: boolean }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await upsertGovernanceSettings(form);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const textarea = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-60";

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.sonderfall_kleines_institut} disabled={!canWrite || pending}
          onChange={(e) => setForm((f) => ({ ...f, sonderfall_kleines_institut: e.target.checked }))}
          className="h-4 w-4 accent-copper-500" />
        Compliance-Funktion wird durch ein Mitglied der Geschäftsleitung wahrgenommen (Sonderfall sehr kleines Institut, Tz. 4 S. 2)
      </label>

      {form.sonderfall_kleines_institut && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Maßnahmen zur Vermeidung von Interessenkonflikten (Pflichtfeld)
          </label>
          <textarea rows={2} disabled={!canWrite || pending} value={form.interessenkonflikt_massnahmen ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, interessenkonflikt_massnahmen: e.target.value }))} className={textarea} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Begründung der Funktionskombination
        </label>
        <textarea rows={3} disabled={!canWrite || pending} value={form.kombination_rationale ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, kombination_rationale: e.target.value }))} className={textarea} />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ressourcenausstattung — Selbsteinschätzung
        </label>
        <textarea rows={2} disabled={!canWrite || pending} value={form.ressourcenausstattung ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ressourcenausstattung: e.target.value }))} className={textarea} />
      </div>

      {canWrite && (
        <div className="flex items-center gap-2">
          <Button className="px-3 py-1.5 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
          {saved && <span className="text-xs text-status-success">Gespeichert.</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
