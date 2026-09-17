"use client";

import { useState, useTransition } from "react";
import { setChecklistStatus, type ChecklistStatus } from "@/app/(app)/outsourcing/actions";
import type { ChecklistCatalogItem } from "@/lib/regstack/contract-checklist-catalog";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

const STATUS_OPTS: { v: ChecklistStatus; l: string }[] = [
  { v: "erfuellt", l: "Erfüllt" },
  { v: "nicht_erfuellt", l: "Nicht erfüllt" },
  { v: "in_ueberarbeitung", l: "Vertrag wird überarbeitet" },
];

export function ChecklistRow({
  auslagerungId,
  item,
  currentStatus,
  begruendung,
  canWrite,
}: {
  auslagerungId: string;
  item: ChecklistCatalogItem;
  currentStatus: ChecklistStatus;
  begruendung: string | null;
  canWrite: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<ChecklistStatus>(currentStatus);
  const [notiz, setNotiz] = useState(begruendung ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await setChecklistStatus(auslagerungId, item.code, status, notiz || null);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="border-b border-border-subtle px-5 py-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.buchstabe ? (
              <span className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono text-copper-300">
                {item.buchstabe})
              </span>
            ) : (
              <span className="rounded bg-graphite-800 px-1.5 py-0.5 font-mono">
                {item.tzReferenz.replace("AT 9 ", "")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{item.bezeichnung}</p>
          {item.erlaeuterung && <p className="mt-1 text-xs text-muted-foreground">{item.erlaeuterung}</p>}
          {currentStatus !== "erfuellt" && begruendung && (
            <p className="mt-1.5 rounded bg-status-warning-bg px-2 py-1 text-xs text-status-warning">Notiz: {begruendung}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={currentStatus} />
          {canWrite && !editing && (
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 rounded-md border border-border-strong bg-graphite-950 p-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.v}
                onClick={() => setStatus(opt.v)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  status === opt.v
                    ? "border-copper-500 bg-copper-500/10 text-copper-300"
                    : "border-border-strong text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {status !== "erfuellt" && (
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="Notiz (optional)"
              rows={2}
              className="mt-2 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-copper-500"
            />
          )}

          {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}

          <div className="mt-2 flex gap-2">
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={handleSave}>
              {pending ? "Speichert…" : "Speichern"}
            </Button>
            <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditing(false)} disabled={pending}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
