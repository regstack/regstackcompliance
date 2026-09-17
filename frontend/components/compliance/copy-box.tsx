"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyBox({ title, csv }: { title: string; csv: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <pre className="max-h-64 overflow-auto rounded-md border border-border-strong bg-graphite-950 p-3 font-mono text-[11px] leading-relaxed text-graphite-100">
        {csv}
      </pre>
      <Button variant="secondary" className="mt-2 px-2.5 py-1 text-xs" onClick={copy}>
        {copied ? "Kopiert ✓" : "In Zwischenablage kopieren"}
      </Button>
    </div>
  );
}
