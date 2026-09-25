import { listAccessGrants, findAccessGrant, resolveUserName } from "@/lib/regstack/access-grants";
import { getBackendSession, canApproveAccessGrant } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { GrantCard } from "@/components/access-grants/grant-card";
import { approveOutsourcingAccessGrant, denyOutsourcingAccessGrant, revokeOutsourcingAccessGrant } from "./actions";

export default async function OutsourcingZugriffsanfragenPage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const grants = await listAccessGrants();
  const grant = findAccessGrant(grants, "OUTSOURCING");
  const [requestedByName, decidedByName] = await Promise.all([
    resolveUserName(grant?.requestedByUserId ?? null),
    resolveUserName(grant?.decidedByUserId ?? null),
  ]);

  const canDecide = canApproveAccessGrant(session.role, "OUTSOURCING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Zugriffsanfragen Interne Revision
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die Interne Revision benötigt eine aktive Freigabe, um Outsourcing-Daten (Auslagerungsregister,
          Verträge, Berichte) einsehen zu können. Genehmigen Sie hier die Anfrage oder entziehen Sie
          einen zuvor erteilten Zugriff.
        </p>
      </div>

      {!canDecide && (
        <Banner title="Nur zur Ansicht">
          Nur Auslagerungsbeauftragte:r, Geschäftsleitung oder Admin können hier entscheiden.
        </Banner>
      )}

      <GrantCard
        title="Zugriff der Internen Revision auf Outsourcing"
        grant={grant}
        requestedByName={requestedByName}
        decidedByName={decidedByName}
        onApprove={
          canDecide
            ? async () => {
                "use server";
                await approveOutsourcingAccessGrant();
              }
            : undefined
        }
        onDeny={
          canDecide
            ? async (note: string) => {
                "use server";
                await denyOutsourcingAccessGrant(note);
              }
            : undefined
        }
        onRevoke={
          canDecide
            ? async (note: string) => {
                "use server";
                await revokeOutsourcingAccessGrant(note);
              }
            : undefined
        }
      />
    </div>
  );
}
