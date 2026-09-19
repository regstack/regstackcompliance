"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export type EditableSection = { title: string; content: string; linkedLineItemLabel: string | null; sortOrder: number };
type InitialSection = { title: string; content: string; linkedLineItemLabel?: string | null; sortOrder: number };

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50";

export function SectionsEditor({
  initialSections,
  canWrite,
  showLinkedLineItem = false,
  onSave,
}: {
  initialSections: InitialSection[];
  canWrite: boolean;
  showLinkedLineItem?: boolean;
  onSave: (sections: EditableSection[]) => Promise<void>;
}) {
  const [sections, setSections] = useState<EditableSection[]>(
    initialSections.map((s) => ({ ...s, linkedLineItemLabel: s.linkedLineItemLabel ?? null }))
  );
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<EditableSection>) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setDirty(true);
    setSaved(false);
  }

  function addSection() {
    setSections((prev) => [...prev, { title: "", content: "", linkedLineItemLabel: null, sortOrder: prev.length }]);
    setDirty(true);
  }

  function removeSection(i: number) {
    setSections((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await onSave(sections.map((s, idx) => ({ ...s, sortOrder: idx })));
        setDirty(false);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <div key={i} className="rounded-lg border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-3">
            <input
              className={`${inputCls} w-full font-semibold`}
              placeholder="Abschnittstitel"
              value={s.title}
              disabled={!canWrite}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            {canWrite && (
              <button type="button" onClick={() => removeSection(i)} className="shrink-0 text-xs text-status-danger hover:underline">
                Entfernen
              </button>
            )}
          </div>
          <textarea
            className={`${inputCls} mt-2 w-full`}
            rows={4}
            placeholder="Text"
            value={s.content}
            disabled={!canWrite}
            onChange={(e) => update(i, { content: e.target.value })}
          />
          {showLinkedLineItem && (
            <input
              className={`${inputCls} mt-2 w-full`}
              placeholder="Verknüpfte Bilanzposition (optional)"
              value={s.linkedLineItemLabel ?? ""}
              disabled={!canWrite}
              onChange={(e) => update(i, { linkedLineItemLabel: e.target.value || null })}
            />
          )}
        </div>
      ))}

      {canWrite && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={addSection}>
            + Abschnitt hinzufügen
          </Button>
          <Button variant="primary" disabled={!dirty || pending} onClick={save}>
            Speichern
          </Button>
          {saved && !dirty && <span className="text-xs text-status-success">Gespeichert</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
