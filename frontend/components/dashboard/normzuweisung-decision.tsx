"use client";

import { useState, useTransition } from "react";
import { decideNormzuweisung } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function NormzuweisungDecision({ handshakeId, normId }: { handshakeId: string; normId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await decideNormzuweisung(handshakeId, normId, note);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Entscheidung fehlgeschlagen.");
      }
    });
  }

  if (done) return <span className="text-xs text-status-success">Entschieden</span>;

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
        rows={2}
        placeholder="Entscheidungsbegründung (Pflichtfeld)"
        className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-copper-500 disabled:opacity-50"
      />
      <Button className="px-2.5 py-1 text-xs" onClick={handleClick} disabled={pending || !note.trim()}>
        {pending ? "Speichert…" : "Entscheiden"}
      </Button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
