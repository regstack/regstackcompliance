import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function RevisionLayout({ children }: { children: React.ReactNode }) {
  const session = await getBackendSession();

  // Every Interne-Revision page below fetches through the backend — without a session those
  // calls would all 401, so this is checked once here (same pattern as Compliance's layout).
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Bitte melden Sie sich erneut an, oder wenden Sie sich an einen Administrator.
        </p>
      </Card>
    );
  }

  const readOnly = !canWriteRevisions(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Revisions-Cockpit</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Interne Revision nach MaRisk AT 4.4.3
        </p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Modul Interne Revision erlaubt Einsicht, aber keine Änderungen.
            Anlage, Freigaben und Statuswechsel sind für Ihre Rolle deaktiviert.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
