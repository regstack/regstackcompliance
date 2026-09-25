"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveAccountingAccessGrant() {
  await decideAccessGrant("ACCOUNTING", "approve");
}
export async function denyAccountingAccessGrant(note?: string) {
  await decideAccessGrant("ACCOUNTING", "deny", note);
}
export async function revokeAccountingAccessGrant(note?: string) {
  await decideAccessGrant("ACCOUNTING", "revoke", note);
}
