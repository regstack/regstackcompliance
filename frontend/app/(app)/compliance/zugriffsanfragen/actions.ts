"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveComplianceAccessGrant() {
  await decideAccessGrant("COMPLIANCE", "approve");
}
export async function denyComplianceAccessGrant(note?: string) {
  await decideAccessGrant("COMPLIANCE", "deny", note);
}
export async function revokeComplianceAccessGrant(note?: string) {
  await decideAccessGrant("COMPLIANCE", "revoke", note);
}
