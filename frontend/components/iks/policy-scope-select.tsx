"use client";

import { useState, useTransition } from "react";
import { updatePolicyDocument } from "@/app/(app)/iks/actions";
import { POLICY_SCOPE_LABELS, type PolicyDocumentScope } from "@/lib/regstack/ics-utils";

const SCOPE_OPTIONS: PolicyDocumentScope[] = ["KUNDENRICHTLINIE", "SOFTWARE_MARISK_NACHWEIS"];

/** Inline edit of an existing document's scope — the create form (policy-form.tsx) sets it once
 * up front, this covers re-classifying an existing document without a separate edit dialog. */
export function PolicyScopeSelect({ id, scope, canWrite }: { id: string; scope: PolicyDocumentScope; canWrite: boolean }) {
  const [value, setValue] = useState(scope);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canWrite) {
    return <span className="text-[11px] text-muted-foreground">{POLICY_SCOPE_LABELS[value]}</span>;
  }

  return (
    <div className="inline-flex flex-col gap-0.5">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as PolicyDocumentScope;
          setValue(next);
          setError(null);
          startTransition(async () => {
            try {
              await updatePolicyDocument(id, { scope: next });
            } catch (err) {
              setValue(scope);
              setError(err instanceof Error ? err.message : "Ändern fehlgeschlagen.");
            }
          });
        }}
        className="rounded-full border border-border-subtle bg-graphite-800 px-2 py-0.5 text-[11px] text-graphite-300 disabled:opacity-50"
      >
        {SCOPE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {POLICY_SCOPE_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] text-status-danger">{error}</span>}
    </div>
  );
}
