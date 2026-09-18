"use client";

import { useState, useTransition } from "react";
import { approveAuditPlan } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function AuditPlanApproveButton({ auditPlanId }: { auditPlanId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await approveAuditPlan(auditPlanId);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Genehmigung fehlgeschlagen.");
      }
    });
  }

  if (done) return <span className="text-xs text-status-success">Genehmigt</span>;

  return (
    <div>
      <Button className="px-2.5 py-1 text-xs" onClick={handleClick} disabled={pending}>
        {pending ? "Genehmigt…" : "Prüfungsplan genehmigen"}
      </Button>
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
