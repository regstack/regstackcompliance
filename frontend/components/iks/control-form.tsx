"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONTROL_TYPE_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/regstack/ics-utils";
import { createControl } from "@/app/(app)/iks/actions";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function ControlForm({ businessProcessId }: { businessProcessId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [controlType, setControlType] = useState<keyof typeof CONTROL_TYPE_LABELS>("MANUAL");
  const [frequency, setFrequency] = useState<keyof typeof CONTROL_FREQUENCY_LABELS>("MONTHLY");
  const [description, setDescription] = useState("");
  const [risksAddressed, setRisksAddressed] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Kontrolle hinzufügen
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
        const id = await createControl({
          name,
          controlType,
          frequency,
          description: description || undefined,
          risksAddressed: risksAddressed || undefined,
          businessProcessIds: [businessProcessId],
        });
        router.push(`/iks/kontrollen/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-subtle p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Bezeichnung
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={labelCls}>
          Kontrolltyp
          <select className={inputCls} value={controlType} onChange={(e) => setControlType(e.target.value as typeof controlType)}>
            {Object.entries(CONTROL_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Häufigkeit
          <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
            {Object.entries(CONTROL_FREQUENCY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Adressierte Risiken
          <input className={inputCls} value={risksAddressed} onChange={(e) => setRisksAddressed(e.target.value)} />
        </label>
      </div>
      <label className={labelCls}>
        Beschreibung
        <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
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
