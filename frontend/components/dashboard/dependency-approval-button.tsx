"use client";

import { useState, useTransition } from "react";
import { approveDependencyAcceptance } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";

export function DependencyApprovalButton({ activityId }: { activityId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await approveDependencyAcceptance(activityId, name);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Genehmigung fehlgeschlagen.");
      }
    });
  }

  if (done) return <span className="text-xs text-status-success">Genehmigt</span>;

  return (
    <div className="mt-2 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
        placeholder="Name der genehmigenden Person"
        className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-copper-500 disabled:opacity-50"
      />
      <Button className="px-2.5 py-1 text-xs" onClick={handleClick} disabled={pending || !name.trim()}>
        {pending ? "Genehmigt…" : "Dependency-Acceptance genehmigen"}
      </Button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
