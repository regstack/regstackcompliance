import { listIctArrangements, listIctProviders } from "@/lib/regstack/ict-register";
import { getBackendSession, canWriteIctRegister } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { IctArrangementsPanel, IctProvidersPanel } from "@/components/outsourcing/ict-register-panels";

export default async function IctRegisterPage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
      </Card>
    );
  }

  const [providers, arrangements] = await Promise.all([listIctProviders(), listIctArrangements()]);
  const canWrite = canWriteIctRegister(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          DORA-Register (Art. 28–30)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register über IKT-Drittanbieter und die zugehörigen Vertragsverhältnisse. Interne
          Arbeitsgrundlage — kein geprüfter 1:1-Abgleich mit den offiziellen EBA/ESA-Meldevorlagen.
        </p>
      </div>

      <IctProvidersPanel providers={providers} canWrite={canWrite} />
      <IctArrangementsPanel arrangements={arrangements} providers={providers} canWrite={canWrite} />
    </div>
  );
}
