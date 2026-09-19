"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateDocumentForm({
  defaultYear,
  onCreate,
  detailHrefBase,
}: {
  defaultYear: number;
  onCreate: (fiscalYear: number) => Promise<string>;
  detailHrefBase: string;
}) {
  const router = useRouter();
  const [year, setYear] = useState(defaultYear);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await onCreate(year);
        router.push(`${detailHrefBase}/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="w-24 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground"
      />
      <Button variant="primary" disabled={pending} onClick={create}>
        Geschäftsjahr anlegen
      </Button>
      {error && <span className="text-xs text-status-danger">{error}</span>}
    </div>
  );
}
