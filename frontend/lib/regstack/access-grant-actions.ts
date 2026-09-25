"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { AccessGrant, AccessGrantModule } from "@/lib/regstack/access-grants";

// One module dashboard + one approval page per AccessGrantModule — revalidated together so an
// approve/deny/revoke immediately reflects on both the approver's own page and (for the dashboard)
// the friendly-403 banner Interne Revision would otherwise see.
const MODULE_PATHS: Record<AccessGrantModule, { approvalPage: string; dashboard: string }> = {
  OUTSOURCING: { approvalPage: "/outsourcing/zugriffsanfragen", dashboard: "/outsourcing" },
  COMPLIANCE: { approvalPage: "/compliance/zugriffsanfragen", dashboard: "/compliance" },
  ACCOUNTING: { approvalPage: "/buchhaltung/zugriffsanfragen", dashboard: "/buchhaltung" },
  IKS: { approvalPage: "/iks/zugriffsanfragen", dashboard: "/iks" },
  RISIKOMANAGEMENT: { approvalPage: "/risikomanagement/zugriffsanfragen", dashboard: "/risikomanagement" },
  IT_RISIKO: { approvalPage: "/it-risiko/zugriffsanfragen", dashboard: "/it-risiko" },
};

/** Shared by every module's approval page — which module and who may call it is enforced
 * server-side by /access-grants/:module/:decision itself (APPROVER_ROLES in accessGrants.routes.ts);
 * this is just the one place that calls it and revalidates the right paths. */
export async function decideAccessGrant(
  accessModule: AccessGrantModule,
  decision: "approve" | "deny" | "revoke",
  note?: string
) {
  await apiFetch<AccessGrant>(`/access-grants/${accessModule}/${decision}`, {
    method: "POST",
    body: JSON.stringify({ note: note || undefined }),
  });
  const paths = MODULE_PATHS[accessModule];
  revalidatePath(paths.approvalPage);
  revalidatePath(paths.dashboard);
  revalidatePath("/interne-revision/zugriffsanfragen");
}
