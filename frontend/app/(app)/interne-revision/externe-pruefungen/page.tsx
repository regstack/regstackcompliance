import { listExternePruefungen, listAllPersons } from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { ExternePruefungenPanel } from "@/components/revisions/externe-pruefungen/externe-pruefungen-panel";

export default async function ExternePruefungenPage() {
  const session = await getBackendSession();
  const [pruefungen, personen] = await Promise.all([listExternePruefungen(), listAllPersons()]);

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const canAcknowledge = session ? isGeschaeftsleitung(session.role) : false;

  const alleFeststellungen = pruefungen.flatMap((p) => p.feststellungen);
  const offen = alleFeststellungen.filter((f) => f.status !== "geschlossen").length;
  const meineOffen = session
    ? alleFeststellungen.filter((f) => f.status !== "geschlossen" && f.verantwortlich_person_id === session.userId).length
    : 0;
  const wartetAufKenntnisnahme = pruefungen.filter((p) => !p.gl_kenntnisnahme_am).length;

  return (
    <div className="space-y-6">
      <Banner title="Feststellungen aus der externen Prüfung">
        Einmal jährlich erhält die Geschäftsleitung den Bericht des externen Prüfers. Die Interne
        Revision erfasst ihn hier und verteilt jede Feststellung an den zuständigen Fachbereich
        bzw. das zuständige Modul — die/der Verantwortliche sieht sie sofort in ihrer/seiner
        eigenen Ansicht und meldet die Umsetzung, bevor die Revision die Wirksamkeit bestätigt und
        schließt.
      </Banner>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Externe Prüfungen erfasst" value={pruefungen.length} />
        <StatCard label="offene Feststellungen" value={offen} tone={offen ? "warn" : "good"} />
        <StatCard label="davon mir zugewiesen" value={meineOffen} tone={meineOffen ? "warn" : "good"} />
        <StatCard label="GL-Kenntnisnahme aussteht" value={wartetAufKenntnisnahme} tone={wartetAufKenntnisnahme ? "warn" : "good"} />
      </div>

      <ExternePruefungenPanel
        pruefungen={pruefungen}
        personen={personen}
        canWrite={canWrite}
        canAcknowledge={canAcknowledge}
        currentUserId={session?.userId ?? ""}
      />
    </div>
  );
}
