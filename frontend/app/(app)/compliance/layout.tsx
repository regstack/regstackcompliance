import { getSessionContext, canWriteCompliance, hasComplianceAccess } from "@/lib/regstack/session";
import { ComplianceNav } from "@/components/compliance/compliance-nav";
import { Banner } from "@/components/ui/banner";

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  const readOnly = ctx ? hasComplianceAccess(ctx) && !canWriteCompliance(ctx) : false;

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-semibold text-foreground">Compliance-Cockpit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compliance-Funktion nach MaRisk AT 4.4.2
        </p>
      </div>
      <ComplianceNav />
      {readOnly && (
        <div className="mb-6">
          <Banner tone="warn" title="Nur-Lese-Zugang">
            Ihre Rolle im Compliance-Modul erlaubt Einsicht, aber keine Änderungen. Freigaben,
            Einstufungen und Statuswechsel sind für Ihre Rolle deaktiviert.
          </Banner>
        </div>
      )}
      {children}
    </div>
  );
}
