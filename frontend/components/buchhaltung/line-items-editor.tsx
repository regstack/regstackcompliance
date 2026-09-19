"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export type EditableLineItem = {
  side?: "AKTIVA" | "PASSIVA";
  section: string;
  label: string;
  currentAmount: number;
  priorYearAmount: number | null;
  sortOrder: number;
};

const inputCls = "rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground disabled:opacity-50";

export function LineItemsEditor({
  initialItems,
  sideOptions,
  sectionOptions,
  canWrite,
  onSave,
}: {
  initialItems: EditableLineItem[];
  sideOptions?: { value: string; label: string }[];
  sectionOptions: { value: string; label: string }[];
  canWrite: boolean;
  onSave: (items: EditableLineItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<EditableLineItem[]>(initialItems);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<EditableLineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setDirty(true);
    setSaved(false);
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      {
        side: sideOptions ? (sideOptions[0].value as "AKTIVA" | "PASSIVA") : undefined,
        section: sectionOptions[0].value,
        label: "",
        currentAmount: 0,
        priorYearAmount: null,
        sortOrder: prev.length,
      },
    ]);
    setDirty(true);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await onSave(items.map((it, idx) => ({ ...it, sortOrder: idx })));
        setDirty(false);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const total = items.reduce((sum, it) => sum + (Number(it.currentAmount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {sideOptions && <th className="px-3 py-2">Seite</th>}
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Bezeichnung</th>
              <th className="px-3 py-2 text-right">Berichtsjahr (€)</th>
              <th className="px-3 py-2 text-right">Vorjahr (€)</th>
              {canWrite && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-border-subtle last:border-0">
                {sideOptions && (
                  <td className="px-3 py-1.5">
                    <select
                      className={inputCls}
                      value={it.side}
                      disabled={!canWrite}
                      onChange={(e) => update(i, { side: e.target.value as "AKTIVA" | "PASSIVA" })}
                    >
                      {sideOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-1.5">
                  <select className={inputCls} value={it.section} disabled={!canWrite} onChange={(e) => update(i, { section: e.target.value })}>
                    {sectionOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input className={`${inputCls} w-full min-w-[220px]`} value={it.label} disabled={!canWrite} onChange={(e) => update(i, { label: e.target.value })} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    className={`${inputCls} w-32 text-right`}
                    value={it.currentAmount}
                    disabled={!canWrite}
                    onChange={(e) => update(i, { currentAmount: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    className={`${inputCls} w-32 text-right`}
                    value={it.priorYearAmount ?? ""}
                    disabled={!canWrite}
                    onChange={(e) => update(i, { priorYearAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </td>
                {canWrite && (
                  <td className="px-3 py-1.5">
                    <button type="button" onClick={() => removeRow(i)} className="text-xs text-status-danger hover:underline">
                      Entfernen
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface font-semibold text-foreground">
              <td className="px-3 py-2" colSpan={sideOptions ? 3 : 2}>
                Summe
              </td>
              <td className="px-3 py-2 text-right">{new Intl.NumberFormat("de-DE").format(total)} €</td>
              <td colSpan={canWrite ? 2 : 1} />
            </tr>
          </tfoot>
        </table>
      </div>

      {canWrite && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={addRow}>
            + Position hinzufügen
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
