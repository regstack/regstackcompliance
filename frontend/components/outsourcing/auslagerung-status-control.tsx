"use client";

import { useState, useTransition } from "react";
import { activateActivity } from "@/app/(app)/outsourcing/actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

// The backend only exposes a one-way ENTWURF -> AKTIV transition (POST .../activate, gated by the
// server-side activation blockers) — there's no "downgrade" endpoint and no BEENDET status in the
// Prisma ActivityStatus enum, unlike the old Supabase-backed three-way (entwurf/aktiv/beendet) control.
export function AuslagerungStatusControl({
  auslagerungId,
  currentStatus,
  offenCount,
}: {
  auslagerungId: string;
  currentStatus: "ENTWURF" | "AKTIV";
  offenCount: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      try {
        await activateActivity(auslagerungId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktivierung fehlgeschlagen.");
      }
    });
  }

  if (currentStatus === "AKTIV") {
    return <StatusPill status="aktiv" />;
  }

  return (
    <div className="text-right">
      <Button variant="primary" className="px-2.5 py-1 text-xs" disabled={pending} onClick={handleActivate}>
        {pending ? "Aktiviert…" : "Aktivieren"}
      </Button>
      {offenCount > 0 && (
        <p className="mt-2 max-w-52 text-xs text-status-warning">
          Ggf. Aktivierungssperre: {offenCount} Checkliste-Punkt(e) noch offen.
        </p>
      )}
      {error && <p className="mt-2 max-w-52 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
