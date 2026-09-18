import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";
import { ratingMeta } from "@/lib/regstack/revisions-utils";

export type PruefungRow = {
  id: string;
  subject: string;
  period_from: string | null;
  period_to: string | null;
  status: string;
  overall_rating: string | null;
  report_date: string | null;
  durchfuehrung: string;
  budget_days: number;
  actual_days: number;
  pruefungsobjekt: { bezeichnung: string } | null;
};

export function PruefungenTable({ rows }: { rows: PruefungRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Prüfungsgegenstand</th>
            <th className="px-3 py-2 font-medium">Zeitraum</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Gesamturteil</th>
            <th className="px-3 py-2 font-medium">Budget / Ist (PT)</th>
            <th className="px-3 py-2 font-medium">Berichtsdatum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const rm = ratingMeta(a.overall_rating);
            return (
              <tr key={a.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                <td className="px-3 py-2.5">
                  <Link href={`/interne-revision/pruefungen/${a.id}`} className="font-medium text-foreground hover:text-copper-300">
                    {a.subject}
                  </Link>
                  {a.durchfuehrung === "ausgelagert" && <span className="ml-1.5"><StatusPill status="in_pruefung" label="ausgelagert" /></span>}
                  {a.pruefungsobjekt && <div className="mt-0.5 text-xs text-muted-foreground">{a.pruefungsobjekt.bezeichnung}</div>}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{a.period_from ?? "–"} – {a.period_to ?? "–"}</td>
                <td className="px-3 py-2.5"><StatusPill status={a.status} /></td>
                <td className="px-3 py-2.5">{rm.v ? <StatusPill status={rm.v} label={rm.l} /> : <span className="text-muted-foreground">{rm.l}</span>}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{a.budget_days || 0} / {a.actual_days || 0}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{a.report_date ?? "–"}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Noch keine Prüfungen angelegt.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
