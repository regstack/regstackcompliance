import { getBackendSession, canWriteCompliance } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const session = await getBackendSession();

  // Every Compliance page below fetches through the backend — without a session those calls
  // would all 401, so this is checked once here rather than repeated in all eleven pages.
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

  // Everyone with a valid backend session can read (RBAC's complianceRecord.read covers every
  // role) — this banner is purely a UI convenience for roles that can view but not write.
  const readOnly = !canWriteCompliance(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Compliance-Cockpit</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Compliance-Funktion nach MaRisk AT 4.4.2
        </p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Compliance-Modul erlaubt Einsicht, aber keine Änderungen. Freigaben,
            Einstufungen und Statuswechsel sind für Ihre Rolle deaktiviert.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
