import { getTwoFactorStatus } from "./actions";
import { TwoFactorSettings } from "@/components/konto/two-factor-settings";

export default async function KontoPage() {
  const status = await getTwoFactorStatus().catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-foreground">Konto & Sicherheit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Einstellungen für Ihr eigenes Konto.
        </p>
      </div>

      {status === null ? (
        <p className="text-sm text-status-danger">
          Sicherheitseinstellungen konnten nicht geladen werden — kein verknüpftes Backend-Konto?
        </p>
      ) : status.eligible ? (
        <TwoFactorSettings initiallyEnabled={status.totpEnabled} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Die Zwei-Faktor-Authentifizierung steht aktuell nur für die Rollen Geschäftsleitung und
          Admin zur Verfügung.
        </p>
      )}
    </div>
  );
}
