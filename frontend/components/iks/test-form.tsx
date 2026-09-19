"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createControlTest } from "@/app/(app)/iks/actions";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function TestForm({ controlId }: { controlId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plannedPeriod, setPlannedPeriod] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Kontrolltest planen
      </Button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await createControlTest({
          controlId,
          plannedPeriod: plannedPeriod || undefined,
          plannedDate: plannedDate ? new Date(plannedDate).toISOString() : undefined,
        });
        setOpen(false);
        setPlannedPeriod("");
        setPlannedDate("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle p-4">
      <label className={labelCls}>
        Zeitraum
        <input className={inputCls} placeholder="z. B. Q2 2026" value={plannedPeriod} onChange={(e) => setPlannedPeriod(e.target.value)} />
      </label>
      <label className={labelCls}>
        Geplantes Datum
        <input type="date" className={inputCls} value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
      </label>
      <Button variant="primary" disabled={pending} onClick={save}>
        Planen
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
      {error && <span className="text-xs text-status-danger">{error}</span>}
    </div>
  );
}
