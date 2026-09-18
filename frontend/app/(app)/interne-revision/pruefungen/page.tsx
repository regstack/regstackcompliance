import { listPruefungen, listUniversum } from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { PruefungenTable, type PruefungRow } from "@/components/revisions/pruefungen/pruefungen-table";
import { PruefungenAdd } from "@/components/revisions/pruefungen/pruefungen-add";

export default async function PruefungenPage() {
  const session = await getBackendSession();
  const canWrite = session ? canWriteRevisions(session.role) : false;

  const [pruefungen, universum] = await Promise.all([listPruefungen(), listUniversum()]);

  const laufend = pruefungen.filter((p) => p.status === "laufend").length;
  const geplant = pruefungen.filter((p) => p.status === "geplant").length;
  const abgeschlossen = pruefungen.filter((p) => p.status === "abgeschlossen").length;

  return (
    <div className="space-y-6">
      <Banner title="Durchführung, Arbeitsunterlagen und Bericht je Prüfung">
        Jede Prüfung führt vom geprüften Risiko über den Prüfungsschritt und die Prüfungshandlung zum Nachweis, zum
        Ergebnis und — falls einschlägig — zur Feststellung (Tz. 7, 10). Nachvollziehbarkeit heißt Wiederholbarkeit: eine
        unabhängige Person muss dieselben Schritte nachvollziehen und zum selben Ergebnis kommen können.
      </Banner>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Prüfungen gesamt" value={pruefungen.length} />
        <StatCard label="geplant" value={geplant} />
        <StatCard label="laufend" value={laufend} tone={laufend ? "warn" : "good"} />
        <StatCard label="abgeschlossen" value={abgeschlossen} tone="good" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Prüfungen</h2>
            <p className="text-xs text-muted-foreground">Berichtsangaben, Arbeitsprogramm und Qualitätssicherung je Prüfung.</p>
          </div>
          {canWrite && <PruefungenAdd universum={universum.map((u) => ({ id: u.id, bezeichnung: u.bezeichnung }))} />}
        </div>
        <div className="p-5 pt-3">
          <PruefungenTable rows={pruefungen as unknown as PruefungRow[]} />
        </div>
      </Card>
    </div>
  );
}
