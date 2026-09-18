import { getRevisionEinstellungen } from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EinstellungenForm } from "@/components/revisions/einstellungen/einstellungen-form";
import type { SeveritySettingsInput } from "./actions";

export default async function RevisionEinstellungenPage() {
  const session = await getBackendSession();
  const settings = await getRevisionEinstellungen();
  const canWrite = session ? canWriteRevisions(session.role) : false;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Institutseigene Kriterien und Fristen — Tz. 6, 7, 12</p>

      <EinstellungenForm
        canWrite={canWrite}
        initial={{
          severity_settings: (settings?.severity_settings as SeveritySettingsInput | null) ?? {},
          angemessene_zeit_tage: settings?.angemessene_zeit_tage ?? 90,
          qs_intervall_monate: settings?.qs_intervall_monate ?? 12,
          risiko_review_intervall_monate: settings?.risiko_review_intervall_monate ?? 12,
        }}
      />

      <Card>
        <CardHeader><CardTitle>Nicht Teil dieses Moduls</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            <b className="text-foreground">Bewusst außerhalb:</b> automatisierte Benachrichtigungen (E-Mail/Push)
            zu Prüfungsfälligkeiten, Maßnahmenfristen und Eskalationsschwellen, sowie eine strukturelle
            Verknüpfung zum Auslagerungsregister (AT 9) für als „ausgelagert&rdquo; markierte Prüfungsobjekte.
          </p>
          <p>
            <b className="text-foreground">Regeln, die hier sichtbar gemacht, aber nicht serverseitig
            erzwungen werden:</b> die Zuweisungssperre nach Tz. 4 und die Unveränderlichkeit freigegebener
            Arbeitspapiere. Das Vier-Augen-Prinzip bei der Freigabe (Reviewer ≠ Ersteller) und der
            Abschluss-Block bei nicht freigegebenen Arbeitspapieren werden serverseitig durchgesetzt.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
