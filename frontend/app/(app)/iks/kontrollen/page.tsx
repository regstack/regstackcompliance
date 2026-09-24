import Link from "next/link";
import { listControls, listControlTests, CONTROL_TYPE_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/regstack/ics";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export default async function KontrollenPage() {
  const [controls, tests] = await Promise.all([listControls(), listControlTests()]);

  function dueState(controlId: string): { label: string; tone: "success" | "warning" | "danger" } {
    const controlTests = tests.filter((t) => t.controlId === controlId);
    if (controlTests.length === 0) return { label: "noch nie getestet", tone: "warning" };
    const latest = [...controlTests].sort((a, b) => (b.plannedDate ?? "").localeCompare(a.plannedDate ?? ""))[0];
    if (latest.status === "COMPLETED") return { label: "aktuell", tone: "success" };
    const overdue = latest.plannedDate ? new Date(latest.plannedDate) <= new Date() : false;
    return overdue ? { label: "fällig", tone: "danger" } : { label: "geplant", tone: "warning" };
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/iks" className="text-xs text-muted-foreground hover:text-copper-300">
          ← Übersicht
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">Alle Kontrollen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vollständiges Kontrollregister über alle Geschäftsprozesse hinweg, mit Teststatus.
        </p>
      </div>

      {controls.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Kontrollen erfasst.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Kontrolle</th>
                  <th className="px-5 py-3 font-medium">Typ</th>
                  <th className="px-5 py-3 font-medium">Frequenz</th>
                  <th className="px-5 py-3 font-medium">Geschäftsprozesse</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Tests</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((c) => {
                  const due = dueState(c.id);
                  return (
                    <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                      <td className="px-5 py-3">
                        <Link href={`/iks/kontrollen/${c.id}`} className="font-medium text-foreground hover:text-copper-300">
                          {c.code && <span className="text-muted-foreground">{c.code} · </span>}
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{CONTROL_TYPE_LABELS[c.controlType]}</td>
                      <td className="px-5 py-3 text-muted-foreground">{CONTROL_FREQUENCY_LABELS[c.frequency]}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {(c.businessProcesses ?? []).length === 0
                          ? "—"
                          : c.businessProcesses!.map((bp) => bp.name).join(", ")}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={c.active ? "aktiv" : "beendet"} label={c.active ? "aktiv" : "inaktiv"} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={due.tone === "success" ? "erfuellt" : due.tone === "danger" ? "nicht_erfuellt" : "in_pruefung"} label={due.label} />
                        <span className="ml-2 text-xs text-muted-foreground">({c.testCount ?? 0})</span>
                      </td>
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
