"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPruefung } from "@/app/(app)/interne-revision/pruefungen/actions";

export function PruefungenAdd({ universum }: { universum: { id: string; bezeichnung: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pruefungsobjektId, setPruefungsobjektId] = useState(universum[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!open) return <Button className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>+ Prüfung anlegen</Button>;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createPruefung({
          pruefungsobjekt_id: pruefungsobjektId, subject: subject || "Prüfung", period_from: periodFrom || null, period_to: periodTo || null,
        });
        router.push(`/interne-revision/pruefungen/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={pruefungsobjektId} disabled={pending} onChange={(e) => setPruefungsobjektId(e.target.value)} className={`sm:col-span-2 ${input}`}>
          {universum.length === 0 && <option value="">— kein Prüfungsobjekt vorhanden —</option>}
          {universum.map((u) => <option key={u.id} value={u.id}>{u.bezeichnung}</option>)}
        </select>
        <input placeholder="Prüfungsgegenstand" value={subject} disabled={pending} onChange={(e) => setSubject(e.target.value)} className={`sm:col-span-2 ${input}`} />
        <input type="date" value={periodFrom} disabled={pending} onChange={(e) => setPeriodFrom(e.target.value)} className={input} />
        <input type="date" value={periodTo} disabled={pending} onChange={(e) => setPeriodTo(e.target.value)} className={input} />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !pruefungsobjektId} onClick={submit}>
          {pending ? "Legt an…" : "Prüfung anlegen"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => setOpen(false)}>Abbrechen</Button>
      </div>
    </div>
  );
}
