import { listAllPersons } from "@/lib/regstack/compliance";
import { listNachweise } from "@/lib/regstack/nachweise";
import { getBackendSession, canWriteNachweis } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { NachweisePagePanel } from "@/components/nachweise/nachweise-page-panel";

export default async function NachweisePage() {
  const [nachweise, personen, session] = await Promise.all([
    listNachweise({ module: "COMPLIANCE" }),
    listAllPersons(),
    getBackendSession(),
  ]);
  const uploaderNames = Object.fromEntries(personen.map((p) => [p.id, p.full_name]));
  const canWrite = session ? canWriteNachweis(session.role) : false;

  return (
    <div className="space-y-6">
      <Banner title="Nachweise auf drei Ebenen">
        Dokumente lassen sich an der Kontrolle (Design-Nachweis), an der einzelnen
        Kontrolldurchführung (Betriebs-Nachweis) und an der Feststellung
        (Remediation-Nachweis) hinterlegen.
      </Banner>
      <Banner tone="warn" title="Unveränderlich, sobald verknüpft">
        Kein stilles Überschreiben: neue Fassungen werden zusätzlich abgelegt, die Vorversion
        bleibt sichtbar und erhalten. Je Datei wird ein Hash-Wert geführt, um die Integrität
        nachzuweisen.
      </Banner>

      <NachweisePagePanel
        items={nachweise}
        module="COMPLIANCE"
        canWrite={canWrite}
        revalidateTargetPath="/compliance/nachweise"
        uploaderNames={uploaderNames}
      />
    </div>
  );
}
