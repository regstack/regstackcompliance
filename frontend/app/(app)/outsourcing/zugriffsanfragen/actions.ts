"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { AccessGrant } from "@/lib/regstack/access-grants";

const REVALIDATE_PATHS = ["/outsourcing/zugriffsanfragen", "/interne-revision/zugriffsanfragen", "/outsourcing"];

async function decide(decision: "approve" | "deny" | "revoke", note?: string) {
  await apiFetch<AccessGrant>(`/access-grants/OUTSOURCING/${decision}`, {
    method: "POST",
    body: JSON.stringify({ note: note || undefined }),
  });
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

export async function approveOutsourcingAccessGrant() {
  await decide("approve");
}
export async function denyOutsourcingAccessGrant(note?: string) {
  await decide("deny", note);
}
export async function revokeOutsourcingAccessGrant(note?: string) {
  await decide("revoke", note);
}
