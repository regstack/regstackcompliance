import Link from "next/link";
import {
  listControls,
  listControlTests,
  listBusinessProcesses,
  CONTROL_TYPE_LABELS,
} from "@/lib/regstack/ics";
import { controlDueState } from "@/lib/regstack/ics-utils";
import { Card } from "@/components/ui/card";

const DOT_TONE: Record<"success" | "warning" | "danger", string> = {
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
};

export default async function KontrollmatrixPage() {
  const [controls, tests, processes] = await Promise.all([listControls(), listControlTests(), listBusinessProcesses()]);

  const sortedControls = [...controls].sort((a, b) => (a.code ?? a.name).localeCompare(b.code ?? b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/iks/kontrollen" className="text-xs text-muted-foreground hover:text-copper-300">
            ← Alle Kontrollen
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">Kontrollmatrix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kontrollen gegen Geschäftsprozesse — ein Punkt markiert, dass die Kontrolle für diesen
            Prozess greift; die Farbe zeigt den Teststatus der Kontrolle (unabhängig vom Prozess).
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-status-success" /> aktuell getestet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-status-warning" /> geplant / nie getestet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-status-danger" /> fällig
          </span>
        </div>
      </div>

      {sortedControls.length === 0 || processes.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Kontrollen oder Geschäftsprozesse erfasst.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-10 min-w-[260px] bg-surface-raised px-5 py-3 font-medium">Kontrolle</th>
                  <th className="px-3 py-3 font-medium">Typ</th>
                  {processes.map((p) => (
                    <th key={p.id} className="min-w-[120px] px-3 py-3 text-center font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedControls.map((c) => {
                  const due = controlDueState(c.id, tests);
                  const processIds = new Set((c.businessProcesses ?? []).map((p) => p.id));
                  return (
                    <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                      <td className="sticky left-0 z-10 bg-surface px-5 py-3">
                        <Link href={`/iks/kontrollen/${c.id}`} className="font-medium text-foreground hover:text-copper-300">
                          {c.code && <span className="text-muted-foreground">{c.code} · </span>}
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{CONTROL_TYPE_LABELS[c.controlType]}</td>
                      {processes.map((p) => (
                        <td key={p.id} className="px-3 py-3 text-center">
                          {processIds.has(p.id) && (
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_TONE[due.tone]}`}
                              title={`${c.name} · ${due.label}`}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
