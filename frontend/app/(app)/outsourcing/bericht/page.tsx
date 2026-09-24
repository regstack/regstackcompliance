import { listOutsourcingReports } from "@/lib/regstack/outsourcing-reports";
import { listActivities } from "@/lib/regstack/outsourcing";
import { getBackendSession, canWriteOutsourcingReport, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { BerichtePanel, NewReportForm } from "@/components/outsourcing/bericht-panel";

export default async function OutsourcingBerichtPage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const [reports, activities] = await Promise.all([listOutsourcingReports(), listActivities()]);
  const canWrite = canWriteOutsourcingReport(session.role);
  const canApprove = isGeschaeftsleitung(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Bericht über die Auslagerungen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MaRisk AT 9 Tz. 13 — mindestens jährlicher Bericht an die Geschäftsleitung mit den drei
          Pflichtaussagen zu Vertragslage, Steuerbarkeit und eingeleiteten Maßnahmen. Sehr kleine
          Institute können dies als Vorstandssitzungsprotokoll führen statt als eigenständigen
          Bericht. Die Kenntnisnahme durch die Geschäftsleitung ist prüfungsrelevant und wird
          separat protokolliert.
        </p>
      </div>

      {canWrite && <NewReportForm activities={activities.map((a) => ({ id: a.id, name: a.name }))} />}

      <BerichtePanel reports={reports} canApprove={canApprove} />
    </div>
  );
}
