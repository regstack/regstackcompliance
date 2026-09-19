"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBusinessProcess } from "@/app/(app)/iks/actions";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function ProcessForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Geschäftsprozess anlegen
      </Button>
    );
  }

  function save() {
    if (!name.trim()) {
      setError("Bezeichnung ist erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const id = await createBusinessProcess({ name, owner: owner || undefined, description: description || undefined });
        router.push(`/iks/prozesse/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle p-4">
      <label className={labelCls}>
        Bezeichnung
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={labelCls}>
        Owner / Abteilung
        <input className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} />
      </label>
      <label className={`${labelCls} min-w-[240px] flex-1`}>
        Beschreibung
        <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <Button variant="primary" disabled={pending} onClick={save}>
        Anlegen
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
      {error && <span className="text-xs text-status-danger">{error}</span>}
    </div>
  );
}
