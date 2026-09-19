import { getBackendSession, canWriteIcs } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";

export default async function IksLayout({ children }: { children: React.ReactNode }) {
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

  const readOnly = !canWriteIcs(session.role);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Internes Kontrollsystem (IKS)</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Geschäftsprozesse, Kontrollen, Kontrolltests und Richtliniendokumente</p>
      </div>
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Modul IKS erlaubt Einsicht, aber keine Änderungen an Prozessen oder Kontrollen.
            Kontrolltests können ggf. weiterhin von der Internen Revision erfasst werden.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
