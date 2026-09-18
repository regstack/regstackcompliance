"use client";

import { useState, useTransition } from "react";
import { setActivityStatus, type ActivityStatus } from "@/app/(app)/outsourcing/actions";
import { Button } from "@/components/ui/button";

const OPTIONS: ActivityStatus[] = ["ENTWURF", "AKTIV", "BEENDET"];

// The backend only gates the ENTWURF -> AKTIV transition (activationBlockers in
// activities.routes.ts); every other transition here is unrestricted for anyone with write
// access, so the warning below only ever applies while still in ENTWURF.
export function AuslagerungStatusControl({
  activityId,
  currentStatus,
  wesentlich,
  offenCount,
}: {
  activityId: string;
  currentStatus: ActivityStatus;
  wesentlich: boolean;
  offenCount: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: ActivityStatus) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      try {
        await setActivityStatus(activityId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Statuswechsel fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="text-right">
      <div className="flex gap-1.5">
        {OPTIONS.map((s) => (
          <Button
            key={s}
            variant={s === currentStatus ? "primary" : "secondary"}
            className="px-2.5 py-1 text-xs capitalize"
            disabled={pending}
            onClick={() => handleChange(s)}
          >
            {s.toLowerCase()}
          </Button>
        ))}
      </div>
      {wesentlich && offenCount > 0 && currentStatus === "ENTWURF" && (
        <p className="mt-2 max-w-52 text-xs text-status-warning">
          Aktivierungssperre: {offenCount} Checkliste-Punkt(e) noch nicht erfüllt.
        </p>
      )}
      {error && <p className="mt-2 max-w-52 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
