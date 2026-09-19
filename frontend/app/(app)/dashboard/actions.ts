"use server";

import { revalidatePath } from "next/cache";
import { acknowledgeReport as acknowledgeComplianceReport, decideNormZuweisung } from "@/app/(app)/compliance/actions";
import { ackQuartalsbericht } from "@/app/(app)/interne-revision/quartalsbericht/actions";
import { approveAuditPlan as approveAuditPlanBackend } from "@/app/(app)/interne-revision/pruefungsuniversum/actions";
import { approveHandlungsoption } from "@/app/(app)/outsourcing/actions";
import { acknowledgeExternePruefung as acknowledgeExternePruefungBackend } from "@/app/(app)/interne-revision/externe-pruefungen/actions";
import type { Database } from "@/lib/database.types";

type ModuleType = Database["public"]["Enums"]["module_type"];

/** Delegates to each module's own backend-backed action, so there's exactly one implementation
 * per operation instead of a second copy living here (the duplication this dashboard used to have
 * for both `decideNormzuweisung` and `approveAuditPlan`, before Compliance/Interne Revision were
 * migrated). Outsourcing has no board-report feature built yet — its `reports` entry is always
 * null (see dashboard.ts), so this branch is unreachable from the UI; it throws rather than
 * silently pretending to support it. */
export async function acknowledgeReport(reportId: string, module: ModuleType) {
  if (module === "compliance") {
    await acknowledgeComplianceReport(reportId);
    return;
  }
  if (module === "internal_audit") {
    // Interne Revision's ack is per-report-type (Quartals-/Jahresbericht use the same underlying
    // model and endpoint), so either helper works here — both just POST .../acknowledge.
    await ackQuartalsbericht(reportId);
    return;
  }
  throw new Error("Outsourcing hat noch keine Berichtsfunktion — dieser Pfad wird nie erreicht.");
}

/** Prüfungsplan-Genehmigung (Tz. 6) — delegates to Interne Revision's own backend-backed action
 * (revisionPlan.approve RBAC, GESCHAEFTSLEITUNG/ADMIN only, enforced server-side). */
export async function approveAuditPlan(auditPlanId: string) {
  await approveAuditPlanBackend(auditPlanId);
  revalidatePath("/dashboard");
}

/** Entscheidung über eine widersprochene Normzuweisung — delegates to the Compliance module's own
 * backend-backed action (complianceHandshake.decide RBAC, GESCHAEFTSLEITUNG/ADMIN only), rather
 * than keeping a second, independently-maintained Supabase implementation of the same operation. */
export async function decideNormzuweisung(handshakeId: string, normId: string, decisionNote: string) {
  await decideNormZuweisung(handshakeId, normId, decisionNote);
}

/** Dependency-Acceptance-Bestätigung (Tz. 6 S.3, BCM_LINKED-Pfad) — delegates to Outsourcing's own
 * backend-backed action (handlungsoption.approve RBAC, GESCHAEFTSLEITUNG/ADMIN only), same
 * delegation pattern as the other two dashboard actions above. */
export async function approveDependencyAcceptance(activityId: string, depApprover: string) {
  await approveHandlungsoption(activityId, depApprover);
  revalidatePath("/dashboard");
}

/** Geschäftsleitung-Kenntnisnahme des jährlichen externen Prüfungsberichts — delegates to Interne
 * Revision's own backend-backed action (externalAuditRecord.acknowledge RBAC,
 * GESCHAEFTSLEITUNG/ADMIN only, enforced server-side). Erst danach verteilt die Revision die
 * Feststellungen an die Fachbereiche. */
export async function acknowledgeExternePruefung(externePruefungId: string) {
  await acknowledgeExternePruefungBackend(externePruefungId);
  revalidatePath("/dashboard");
}
