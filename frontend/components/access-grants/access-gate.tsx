import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { listAccessGrants, findAccessGrant, type AccessGrantModule } from "@/lib/regstack/access-grants";
import type { BackendRole } from "@/lib/regstack/backend-session";

const MODULE_TEXT: Record<AccessGrantModule, { noun: string; approver: string }> = {
  OUTSOURCING: { noun: "das Auslagerungsregister", approver: "des Auslagerungsbeauftragten" },
  COMPLIANCE: { noun: "dieses Dashboard", approver: "der Compliance-Funktion" },
  ACCOUNTING: { noun: "die Buchhaltungsdaten", approver: "der Buchhaltung" },
  IKS: { noun: "die IKS-Daten", approver: "des Risikocontrollings" },
  RISIKOMANAGEMENT: { noun: "die Risikomanagement-Daten", approver: "des Risikocontrollings" },
  IT_RISIKO: { noun: "die IT-Risiko-/BAIT-Daten", approver: "des Risikocontrollings" },
};

/**
 * Interne Revision now needs an APPROVED ModuleAccessGrant before a module's own listXxx() calls
 * are allowed to succeed server-side (requireAccessGrant in rbac.ts) — call this FIRST, before any
 * of those calls, and return its result instead of the page's normal body when it isn't null. Every
 * other role always gets null (proceed normally).
 */
export async function accessGrantBanner(role: BackendRole | undefined, accessModule: AccessGrantModule) {
  if (role !== "INTERNE_REVISION") return null;

  const grants = await listAccessGrants();
  const grant = findAccessGrant(grants, accessModule);
  if (grant?.status === "APPROVED") return null;

  const { noun, approver } = MODULE_TEXT[accessModule];
  return (
    <Banner title="Zugriff noch nicht freigegeben">
      Die Interne Revision benötigt eine aktive Freigabe {approver}, um {noun} einzusehen.{" "}
      <Link href="/interne-revision/zugriffsanfragen" className="underline hover:text-copper-300">
        Zugriff anfragen
      </Link>
      .
    </Banner>
  );
}
