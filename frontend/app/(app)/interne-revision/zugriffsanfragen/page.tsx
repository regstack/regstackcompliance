import { listAccessGrants, findAccessGrant, resolveUserName, type AccessGrantModule } from "@/lib/regstack/access-grants";
import { getBackendSession, isInterneRevision } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card, CardBody } from "@/components/ui/card";
import { GrantCard } from "@/components/access-grants/grant-card";
import { requestAccessGrant } from "./actions";

const MODULES: { module: AccessGrantModule; title: string; basis: string }[] = [
  { module: "OUTSOURCING", title: "Zugriff auf Outsourcing", basis: "AT 9 — Auslagerungsregister, Verträge, Berichte" },
  { module: "COMPLIANCE", title: "Zugriff auf Compliance", basis: "AT 4.4.2 — Rechtsnormenkataster, Risiken & Kontrollen, Feststellungen" },
  { module: "ACCOUNTING", title: "Zugriff auf Buchhaltung", basis: "Bilanz, GuV, Anhang, Lagebericht" },
  { module: "IKS", title: "Zugriff auf IKS", basis: "Geschäftsprozesse, Kontrollen, Richtlinien-Bibliothek" },
  { module: "RISIKOMANAGEMENT", title: "Zugriff auf Risikomanagement", basis: "AT 4 — Risikoinventur, Strategien, Risikotragfähigkeit, Stresstests" },
  { module: "IT_RISIKO", title: "Zugriff auf IT-Risiko / BAIT", basis: "IT-Strategie, Informationsrisiko, Sicherheitsvorfälle, Berechtigungen" },
];

export default async function ZugriffsanfragenPage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const grants = await listAccessGrants();
  const canRequest = isInterneRevision(session.role);

  const cards = await Promise.all(
    MODULES.map(async ({ module, title, basis }) => {
      const grant = findAccessGrant(grants, module);
      const [requestedByName, decidedByName] = await Promise.all([
        resolveUserName(grant?.requestedByUserId ?? null),
        resolveUserName(grant?.decidedByUserId ?? null),
      ]);
      return { module, title, basis, grant, requestedByName, decidedByName };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Zugriffsanfragen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die Interne Revision liest die Daten anderer Module nicht mehr implizit über die
          Rollenmatrix — der jeweilige Fachbereich muss den Zugriff je Modul aktiv freigeben. Diese
          Freigabe ist jederzeit widerruflich.
        </p>
      </div>

      {!canRequest && (
        <Banner title="Nur zur Ansicht">
          Nur Interne Revision oder Admin können hier eine Zugriffsfreigabe anfragen.
        </Banner>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map(({ module, title, basis, grant, requestedByName, decidedByName }) => (
          <GrantCard
            key={module}
            title={title}
            basis={basis}
            grant={grant}
            requestedByName={requestedByName}
            decidedByName={decidedByName}
            onRequest={
              canRequest
                ? async (reason: string) => {
                    "use server";
                    await requestAccessGrant(module, reason);
                  }
                : undefined
            }
          />
        ))}
      </div>

      <Card>
        <CardBody className="text-xs leading-relaxed text-muted-foreground">
          Genehmigt der jeweilige Fachbereich hier nicht, bleiben die Übersichts- und Detailseiten des
          Moduls für die Interne Revision gesperrt (HTTP 403) — die betroffenen Dashboards weisen
          stattdessen auf diese Seite hin.
        </CardBody>
      </Card>
    </div>
  );
}
