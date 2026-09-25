import { getInstitutionSettings } from "@/lib/regstack/institution";
import { getBackendSession, isInterneRevision, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { InstitutsgroesseForm } from "@/components/revisions/institutsgroesse-form";

export default async function InstitutsgroessePage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const institution = await getInstitutionSettings();
  const canWrite = isInterneRevision(session.role) || isGeschaeftsleitung(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Institutsgröße &amp; Erleichterungen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die Institutsgröße treibt mehrere über das Cockpit verstreute regulatorische Erleichterungen —
          hier an einer Stelle erklärt und, für Interne Revision und Geschäftsleitung, änderbar.
        </p>
      </div>

      <InstitutsgroesseForm initial={institution} canWrite={canWrite} />
    </div>
  );
}
