"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

export function DocumentActions({
  status,
  signedOffByMe,
  canWrite,
  canAcknowledge,
  onFinalize,
  onRevise,
  onAcknowledge,
  reviseHref,
}: {
  status: "entwurf" | "final";
  signedOffByMe: boolean;
  canWrite: boolean;
  canAcknowledge: boolean;
  onFinalize?: () => Promise<void>;
  onRevise?: () => Promise<string>;
  onAcknowledge?: () => Promise<void>;
  reviseHref: (id: string) => string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void | string>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (typeof result === "string") router.push(reviseHref(result));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusPill status={status} />
      {status === "entwurf" && canWrite && onFinalize && (
        <Button variant="primary" disabled={pending} onClick={() => run(onFinalize)}>
          Finalisieren
        </Button>
      )}
      {status === "final" && canWrite && onRevise && (
        <Button variant="secondary" disabled={pending} onClick={() => run(onRevise)}>
          Korrektur erstellen
        </Button>
      )}
      {status === "final" && canAcknowledge && onAcknowledge && (
        signedOffByMe ? (
          <span className="text-xs text-status-success">Kenntnisnahme erfasst</span>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => run(onAcknowledge)}>
            Zur Kenntnis nehmen
          </Button>
        )
      )}
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
