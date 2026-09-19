import { getBackendSession, canWriteItRisk } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function ItRisikoLayout({ children }: { children: React.ReactNode }) {
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

  const readOnly = !canWriteItRisk(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">IT-Risiko / BAIT</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          IT-Strategie, Schutzbedarfsfeststellung, Informationsrisiken und Sicherheitsvorfälle nach BAIT.
        </p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im IT-Risiko-Modul erlaubt Einsicht, aber keine Änderungen an IT-Strategie,
            Assets, Risiken oder Sicherheitsvorfällen.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
