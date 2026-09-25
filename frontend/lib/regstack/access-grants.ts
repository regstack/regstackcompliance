import { cache } from "react";
import { apiFetch } from "@/lib/regstack/backend-client";

// Mirrors src/modules/accessGrants/accessGrants.routes.ts — Interne Revision's read access to
// Outsourcing/Compliance data now requires an explicit, approved grant per institution+module
// instead of the static RBAC role matrix alone (see requireAccessGrant in rbac.ts).
export type AccessGrantModule = "OUTSOURCING" | "COMPLIANCE" | "ACCOUNTING" | "IKS" | "RISIKOMANAGEMENT" | "IT_RISIKO";
export type AccessGrantStatus = "PENDING" | "APPROVED" | "DENIED" | "REVOKED";

export type AccessGrant = {
  id: string;
  institutionId: string;
  module: AccessGrantModule;
  status: AccessGrantStatus;
  requestedByUserId: string | null;
  requestedAt: string | null;
  reason: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendUser = { id: string; name: string };

// Same cached-per-request name-lookup pattern as outsourcing-reports.ts's getUserNameMap.
const getUserNameMap = cache(async (): Promise<Map<string, string>> => {
  const users = await apiFetch<BackendUser[]>("/users");
  return new Map(users.map((u) => [u.id, u.name]));
});

export async function listAccessGrants(): Promise<AccessGrant[]> {
  return apiFetch<AccessGrant[]>("/access-grants");
}

/** A module with no row yet simply isn't in the array — treat undefined as "not requested yet". */
export function findAccessGrant(grants: AccessGrant[], accessModule: AccessGrantModule): AccessGrant | undefined {
  return grants.find((g) => g.module === accessModule);
}

export async function resolveUserName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const names = await getUserNameMap();
  return names.get(userId) ?? userId;
}
