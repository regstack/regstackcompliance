"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/regstack/backend-client";
import type { AccessGrant, AccessGrantModule } from "@/lib/regstack/access-grants";

const REVALIDATE_PATHS = [
  "/interne-revision/zugriffsanfragen",
  "/outsourcing/zugriffsanfragen",
  "/compliance/zugriffsanfragen",
  "/outsourcing",
  "/compliance",
];

export async function requestAccessGrant(accessModule: AccessGrantModule, reason?: string) {
  await apiFetch<AccessGrant>(`/access-grants/${accessModule}/request`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || undefined }),
  });
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}
