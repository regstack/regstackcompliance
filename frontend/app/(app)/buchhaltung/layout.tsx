import { getBackendSession, canWriteAccounting } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function BuchhaltungLayout({ children }: { children: React.ReactNode }) {
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

  const readOnly = !canWriteAccounting(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Buchhaltung</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Bilanz, Gewinn- und Verlustrechnung, Anhang und Lagebericht</p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Modul Buchhaltung erlaubt Einsicht, aber keine Änderungen.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
