"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { AccessGrant } from "@/lib/regstack/access-grants";

const REVALIDATE_PATHS = ["/compliance/zugriffsanfragen", "/interne-revision/zugriffsanfragen", "/compliance"];

async function decide(decision: "approve" | "deny" | "revoke", note?: string) {
  await apiFetch<AccessGrant>(`/access-grants/COMPLIANCE/${decision}`, {
    method: "POST",
    body: JSON.stringify({ note: note || undefined }),
  });
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function approveComplianceAccessGrant() {
  await decide("approve");
}
export async function denyComplianceAccessGrant(note?: string) {
  await decide("deny", note);
}
export async function revokeComplianceAccessGrant(note?: string) {
  await decide("revoke", note);
}
