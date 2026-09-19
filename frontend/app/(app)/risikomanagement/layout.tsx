import { getBackendSession, canWriteRiskManagement } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function RisikomanagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getBackendSession();

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

  // Jede Rolle mit Backend-Session darf lesen (riskManagementRecord.read deckt alle Rollen ab) —
  // dieser Banner ist reine UI-Convenience für Rollen ohne Schreibrecht.
  const readOnly = !canWriteRiskManagement(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Risikomanagement</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Risikoinventur, Strategien, Risikotragfähigkeit und Berichtswesen nach MaRisk AT 4.</p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Risikomanagement-Modul erlaubt Einsicht, aber keine Änderungen an
            Inventur, Strategien oder Risikotragfähigkeit.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
