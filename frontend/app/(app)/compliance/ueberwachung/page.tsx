import { listQuellen, listAenderungen, listAllPersons } from "@/lib/regstack/compliance";
import { getBackendSession, canWriteCompliance } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { QuellenPanel } from "@/components/compliance/quellen-panel";
import { AenderungenPanel } from "@/components/compliance/aenderungen-panel";

export default async function UeberwachungPage() {
  const session = await getBackendSession();
  const [quellen, aenderungen, personen] = await Promise.all([listQuellen(), listAenderungen(), listAllPersons()]);
  const canWrite = session ? canWriteCompliance(session.role) : false;

  return (
    <div className="space-y-6">
      <Banner title="Warum dieser Bereich">
        Tz. 2 verlangt die regelmäßige Identifikation. Das Rechtsregister zeigt, was eingestuft
        wurde — dieser Bereich zeigt, dass zum Turnus überwacht wurde, und was aus jeder erfassten
        Änderung geworden ist.
      </Banner>
      <QuellenPanel quellen={quellen} personen={personen} canWrite={canWrite} />
      <AenderungenPanel
        aenderungen={aenderungen}
        quellen={quellen.map((q) => ({ id: q.id, bezeichnung: q.bezeichnung }))}
        personen={personen}
        canWrite={canWrite}
      />
    </div>
  );
}
