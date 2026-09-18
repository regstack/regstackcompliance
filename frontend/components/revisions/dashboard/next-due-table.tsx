import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { UNIV_STATUS_LABEL, type UniverseStatus } from "@/lib/regstack/revisions-utils";

export type NextDueRow = {
  id: string;
  bezeichnung: string;
  cycleYears: number;
  nextDue: string;
  status: UniverseStatus;
};

export function NextDueTable({ rows }: { rows: NextDueRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Nächste Fälligkeiten im Prüfungsuniversum</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tz. 6 — 3-Jahres-Turnus (kürzer bei besonderen Risiken), 5 Jahre für nicht wesentliche Aktivitäten
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Objekt</th>
              <th className="px-3 py-2 font-medium">Zyklus</th>
              <th className="px-3 py-2 font-medium">Nächste Prüfung</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{r.bezeichnung}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.cycleYears} J.</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.nextDue}</td>
                <td className="px-3 py-2.5"><StatusPill status={r.status} label={UNIV_STATUS_LABEL[r.status]} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Kein Prüfungsobjekt im Universum erfasst.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
