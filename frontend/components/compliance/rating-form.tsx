"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addComplianceRating } from "@/app/(app)/compliance/actions";

const RATING_OPTS = [
  { value: "gruen", label: "Grün" },
  { value: "gelb", label: "Gelb" },
  { value: "rot", label: "Rot" },
];

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

const emptyForm = () => ({ periode: "", rating: "gruen", begruendung: "" });

export function RatingForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setOpen(true)}>
        + Rating erfassen
      </Button>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addComplianceRating({
          periode: form.periode,
          rating: form.rating,
          begruendung: form.begruendung || null,
        });
        setOpen(false);
        setForm(emptyForm());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mb-3 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          placeholder="Periode (z. B. Q3 2026)"
          value={form.periode}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, periode: e.target.value }))}
          aria-label="Periode"
          className={inputCls}
        />
        <select
          value={form.rating}
          disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
          aria-label="Rating"
          className={inputCls}
        >
          {RATING_OPTS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <textarea
          placeholder="Begründung (Pflicht bei Änderung des Ratings — Tz. 6)"
          value={form.begruendung}
          disabled={pending}
          rows={2}
          onChange={(e) => setForm((f) => ({ ...f, begruendung: e.target.value }))}
          aria-label="Begründung"
          className={`sm:col-span-2 ${inputCls}`}
        />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.periode.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
