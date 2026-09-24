import Link from "next/link";
import { listBusinessProcesses, listControls, listControlTests, controlsDueForTesting } from "@/lib/regstack/ics";
import { getBackendSession, canWriteIcs } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProcessForm } from "@/components/iks/process-form";

export default async function IksPage() {
  const [session, processes, controls, tests] = await Promise.all([
    getBackendSession(),
    listBusinessProcesses(),
    listControls(),
    listControlTests(),
  ]);
  const canWrite = session ? canWriteIcs(session.role) : false;
  const dueForTesting = controlsDueForTesting(controls, tests);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Geschäftsprozesse" value={processes.length} />
        <StatCard label="Kontrollen" value={controls.length} />
        <StatCard
          label="Kontrollen fällig zum Testen"
          value={dueForTesting}
          tone={dueForTesting > 0 ? "warn" : "good"}
          hint={dueForTesting > 0 ? "kein abgeschlossener Test bis Fälligkeit" : "alle Tests aktuell"}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Geschäftsprozesse</h2>
        {canWrite && <ProcessForm />}
      </div>

      {processes.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Geschäftsprozesse erfasst.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {processes.map((p) => (
            <Link key={p.id} href={`/iks/prozesse/${p.id}`}>
              <Card className="h-full px-5 py-4">
                <CardBody className="space-y-1 p-0">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  {p.owner && <p className="text-xs text-muted-foreground">{p.owner}</p>}
                  <p className="text-xs text-muted-foreground">{p.controlCount ?? 0} Kontrolle(n)</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Link href="/iks/kontrollen" className="inline-block text-sm text-copper-300 hover:underline">
          Alle Kontrollen →
        </Link>
        <Link href="/iks/matrix" className="inline-block text-sm text-copper-300 hover:underline">
          Kontrollmatrix →
        </Link>
        <Link href="/iks/richtlinien" className="inline-block text-sm text-copper-300 hover:underline">
          Richtlinien- &amp; Workflow-Dokumente →
        </Link>
      </div>
    </div>
  );
}
