"use client";

import { useState } from "react";
import { getPolicyDocumentDownloadUrl } from "@/app/(app)/iks/actions";

export function PolicyDownloadButton({ policyId, fileName }: { policyId: string; fileName: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const url = await getPolicyDocumentDownloadUrl(policyId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs text-foreground underline decoration-dotted hover:text-primary disabled:opacity-60"
      >
        📎 {pending ? "Öffnet…" : fileName}
      </button>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
