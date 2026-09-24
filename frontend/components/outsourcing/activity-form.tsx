"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createActivity } from "@/app/(app)/outsourcing/actions";
import type { ScopeType } from "@/lib/regstack/outsourcing";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

const SCOPE_OPTIONS: { value: ScopeType; label: string }[] = [
  { value: "AUSLAGERUNG", label: "Auslagerung" },
  { value: "SONSTIGER_FREMDBEZUG", label: "Sonstiger Fremdbezug" },
  { value: "IKT_DORA", label: "IKT-Drittdienstleistung (DORA)" },
];

export function ActivityForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState("");
  const [scope, setScope] = useState<ScopeType>("AUSLAGERUNG");
  const [scopeJustification, setScopeJustification] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Neue Auslagerung
      </Button>
    );
  }

  function save() {
    if (!name.trim() || !category.trim()) {
      setError("Bezeichnung und Kategorie sind erforderlich.");
      return;
    }
    // Tz. 1 — Scope-Abweichung von "Auslagerung" erfordert eine Begründung (server enforces this
    // too; mirrored here so the error shows before a round-trip).
    if (scope !== "AUSLAGERUNG" && !scopeJustification.trim()) {
      setError('Begründung ist Pflicht, sobald der Scope von "Auslagerung" abweicht (Tz. 1).');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const id = await createActivity({
          name,
          category,
          provider: provider || undefined,
          scope,
          scopeJustification: scope !== "AUSLAGERUNG" ? scopeJustification : undefined,
        });
        router.push(`/outsourcing/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className={labelCls}>
          Bezeichnung
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={labelCls}>
          Kategorie
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className={labelCls}>
          Anbieter
          <input className={inputCls} value={provider} onChange={(e) => setProvider(e.target.value)} />
        </label>
        <label className={labelCls}>
          Scope
          <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value as ScopeType)}>
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {scope !== "AUSLAGERUNG" && (
        <label className={labelCls}>
          Begründung der Scope-Abweichung (Tz. 1)
          <textarea
            className={`${inputCls} min-h-16`}
            value={scopeJustification}
            onChange={(e) => setScopeJustification(e.target.value)}
          />
        </label>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" disabled={pending} onClick={save}>
          Anlegen
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
        {error && <span className="text-xs text-status-danger">{error}</span>}
      </div>
    </div>
  );
}
