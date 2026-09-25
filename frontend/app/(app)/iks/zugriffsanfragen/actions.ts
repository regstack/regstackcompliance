"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveIksAccessGrant() {
  await decideAccessGrant("IKS", "approve");
}
export async function denyIksAccessGrant(note?: string) {
  await decideAccessGrant("IKS", "deny", note);
}
export async function revokeIksAccessGrant(note?: string) {
  await decideAccessGrant("IKS", "revoke", note);
}
