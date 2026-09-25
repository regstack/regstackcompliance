import { redirect } from "next/navigation";
import { getBackendSession, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { getInstitutionSettings } from "@/lib/regstack/institution";
import { InstitutionSettingsForm } from "@/components/konto/institution-settings-form";

// requirePermission("institution", "read"/"write") on the backend is the real boundary
// (institutions.routes.ts). Read is broad (MATRIX.institution.read — every role incl. VIEWER), so
// this page never redirects on read; write (MATRIX.institution.write) is GESCHAEFTSLEITUNG/ADMIN
// only, which is exactly what isGeschaeftsleitung() checks, so it doubles as the write gate here.
export default async function InstitutEinstellungenPage() {
  const session = await getBackendSession();
  if (!session) redirect("/konto");

  const settings = await getInstitutionSettings();
  const canWrite = isGeschaeftsleitung(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-foreground">Institutseinstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canWrite
            ? "Größenklasse, Berechnungsmodell der Wesentlichkeitsanalyse und Revisionsbeauftragter für dieses Institut. Jede Änderung wird im Audit-Trail protokolliert."
            : "Einstellungen dieses Instituts (nur lesend — Änderungen sind Geschäftsleitung und Admin vorbehalten)."}
        </p>
      </div>

      <InstitutionSettingsForm initialSettings={settings} canWrite={canWrite} />
    </div>
  );
}
