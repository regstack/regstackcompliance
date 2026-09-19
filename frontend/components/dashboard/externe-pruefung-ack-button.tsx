"use client";

import { useState, useTransition } from "react";
import { acknowledgeExternePruefung } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function ExternePruefungAckButton({ externePruefungId }: { externePruefungId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await acknowledgeExternePruefung(externePruefungId);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kenntnisnahme fehlgeschlagen.");
      }
    });
  }

  if (done) return <span className="text-xs text-status-success">Kenntnisnahme erfasst</span>;

  return (
    <div>
      <Button className="px-2.5 py-1 text-xs" onClick={handleClick} disabled={pending}>
        {pending ? "Speichert…" : "Kenntnisnahme"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
