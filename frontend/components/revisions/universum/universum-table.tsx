"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { riskScore, cycleYears, nextDueDate, universeStatus, fmtNum, type Risikokriterien } from "@/lib/regstack/revisions-utils";
import { CATEGORY_OPTS, MATERIALITY_OPTS, riskReviewDue } from "@/lib/regstack/revisions-universum";
import { setUniversumMateriality } from "@/app/(app)/interne-revision/pruefungsuniversum/actions";

export type UniversumRow = {
  id: string;
  bezeichnung: string;
  bereich: string | null;
  category: string | null;
  outsourced: boolean;
  materiality: string;
  risikokriterien: unknown;
  reg_anker: string | null;
  status: string;
  risk_review_date: string | null;
  last_audit_date: string | null;
  verantwortlicher: { full_name: string } | null;
};

function MaterialitySelect({ row }: { row: UniversumRow }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(row.materiality);
  return (
    <select
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await setUniversumMateriality(row.id, next);
        });
      }}
      className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
      aria-label={`Wesentlichkeit: ${row.bezeichnung}`}
    >
      {MATERIALITY_OPTS.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

export function UniversumTable({ rows, riskIntervalMonate }: { rows: UniversumRow[]; riskIntervalMonate: number }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Objekt</th>
            <th className="px-3 py-2 font-medium">Kategorie</th>
            <th className="px-3 py-2 font-medium">Wesentlichkeit</th>
            <th className="px-3 py-2 font-medium">Risikoscore</th>
            <th className="px-3 py-2 font-medium">Zyklus</th>
            <th className="px-3 py-2 font-medium">Letzte Prüfung</th>
            <th className="px-3 py-2 font-medium">Nächste fällig</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const risk = (u.risikokriterien ?? {}) as Risikokriterien;
            const score = riskScore(risk);
            const cycle = cycleYears(u.materiality, risk);
            const due = nextDueDate(u.last_audit_date, u.materiality, risk);
            const status = universeStatus(u.last_audit_date, u.materiality, risk);
            const cat = CATEGORY_OPTS.find((c) => c.v === u.category);
            const reviewDue = riskReviewDue(u.risk_review_date, riskIntervalMonate, today);
            return (
              <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                <td className="px-3 py-2.5">
                  <Link href={`/interne-revision/pruefungsuniversum/${u.id}`} className="font-medium text-foreground hover:text-copper-300">
                    {u.bezeichnung}
                  </Link>
                  {u.outsourced && <span className="ml-1.5"><StatusPill status="in_pruefung" label="ausgelagert" /></span>}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {u.verantwortlicher?.full_name ?? <span className="text-status-danger">kein Verantwortlicher benannt</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {cat?.label ?? "—"}
                  {u.reg_anker && <div className="mt-0.5 text-[11px] text-muted-foreground">{u.reg_anker}</div>}
                </td>
                <td className="px-3 py-2.5"><MaterialitySelect row={u} /></td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {score === null ? "unvollständig" : fmtNum(score)}
                  {reviewDue && <div className="mt-1"><StatusPill status="in_pruefung" label="Bewertung überfällig" /></div>}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{cycle} J.</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{u.last_audit_date ?? "–"}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{due}</td>
                <td className="px-3 py-2.5"><StatusPill status={status} /></td>
                <td className="px-3 py-2.5">
                  <Link href={`/interne-revision/pruefungsuniversum/${u.id}`} className="text-xs text-copper-300 hover:text-copper-200">
                    Details
                  </Link>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">Noch keine Prüfungsobjekte erfasst.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
