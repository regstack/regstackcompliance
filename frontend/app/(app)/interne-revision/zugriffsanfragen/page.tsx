import { listAccessGrants, findAccessGrant, resolveUserName } from "@/lib/regstack/access-grants";
import { getBackendSession, isInterneRevision } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card, CardBody } from "@/components/ui/card";
import { GrantCard } from "@/components/access-grants/grant-card";
import { requestAccessGrant } from "./actions";

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
  const outsourcingGrant = findAccessGrant(grants, "OUTSOURCING");
  const complianceGrant = findAccessGrant(grants, "COMPLIANCE");
  const [outsourcingRequestedBy, outsourcingDecidedBy, complianceRequestedBy, complianceDecidedBy] = await Promise.all([
    resolveUserName(outsourcingGrant?.requestedByUserId ?? null),
    resolveUserName(outsourcingGrant?.decidedByUserId ?? null),
    resolveUserName(complianceGrant?.requestedByUserId ?? null),
    resolveUserName(complianceGrant?.decidedByUserId ?? null),
  ]);

  const canRequest = isInterneRevision(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Zugriffsanfragen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die Interne Revision liest Outsourcing- und Compliance-Daten nicht mehr implizit über die
          Rollenmatrix — der jeweilige Fachbereich (Auslagerungsbeauftragte:r bzw. Compliance) muss
          den Zugriff aktiv freigeben. Diese Freigabe ist jederzeit widerruflich.
        </p>
      </div>

      {!canRequest && (
        <Banner title="Nur zur Ansicht">
          Nur Interne Revision oder Admin können hier eine Zugriffsfreigabe anfragen.
        </Banner>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GrantCard
          title="Zugriff auf Outsourcing"
          basis="AT 9 — Auslagerungsregister, Verträge, Berichte"
          grant={outsourcingGrant}
          requestedByName={outsourcingRequestedBy}
          decidedByName={outsourcingDecidedBy}
          onRequest={
            canRequest
              ? async (reason: string) => {
                  "use server";
                  await requestAccessGrant("OUTSOURCING", reason);
                }
              : undefined
          }
        />
        <GrantCard
          title="Zugriff auf Compliance"
          basis="AT 4.4.2 — Rechtsnormenkataster, Risiken & Kontrollen, Feststellungen"
          grant={complianceGrant}
          requestedByName={complianceRequestedBy}
          decidedByName={complianceDecidedBy}
          onRequest={
            canRequest
              ? async (reason: string) => {
                  "use server";
                  await requestAccessGrant("COMPLIANCE", reason);
                }
              : undefined
          }
        />
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
