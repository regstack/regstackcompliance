import Link from "next/link";
import { getTwoFactorStatus } from "./actions";
import { getBackendSession, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { TwoFactorSettings } from "@/components/konto/two-factor-settings";

export default async function KontoPage() {
  const [status, session] = await Promise.all([getTwoFactorStatus().catch(() => null), getBackendSession()]);

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

      {(session?.role === "ADMIN" || session?.role === "GESCHAEFTSLEITUNG") && (
        <div className="rounded-[10px] border border-border-subtle bg-surface p-4">
          <p className="text-sm font-medium text-foreground">Nutzerverwaltung</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.role === "ADMIN"
              ? "Konten für dieses Institut anlegen, Rollen ändern oder deaktivieren."
              : "Konten für dieses Institut einsehen (nur lesend)."}
          </p>
          <Link href="/konto/nutzerverwaltung" className="mt-2 inline-block text-sm text-copper-300 hover:underline">
            Zur Nutzerverwaltung →
          </Link>
        </div>
      )}

      {session && (
        <div className="rounded-[10px] border border-border-subtle bg-surface p-4">
          <p className="text-sm font-medium text-foreground">Institutseinstellungen</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isGeschaeftsleitung(session.role)
              ? "Größenklasse, Berechnungsmodell und Revisionsbeauftragter bearbeiten."
              : "Größenklasse, Berechnungsmodell und Revisionsbeauftragter einsehen (nur lesend)."}
          </p>
          <Link href="/konto/institut" className="mt-2 inline-block text-sm text-copper-300 hover:underline">
            Zu den Institutseinstellungen →
          </Link>
        </div>
      )}
    </div>
  );
}
