"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveOutsourcingAccessGrant() {
  await decideAccessGrant("OUTSOURCING", "approve");
}
export async function denyOutsourcingAccessGrant(note?: string) {
  await decideAccessGrant("OUTSOURCING", "deny", note);
}
export async function revokeOutsourcingAccessGrant(note?: string) {
  await decideAccessGrant("OUTSOURCING", "revoke", note);
}
