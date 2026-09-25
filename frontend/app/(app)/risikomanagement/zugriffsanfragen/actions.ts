"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveRisikomanagementAccessGrant() {
  await decideAccessGrant("RISIKOMANAGEMENT", "approve");
}
export async function denyRisikomanagementAccessGrant(note?: string) {
  await decideAccessGrant("RISIKOMANAGEMENT", "deny", note);
}
export async function revokeRisikomanagementAccessGrant(note?: string) {
  await decideAccessGrant("RISIKOMANAGEMENT", "revoke", note);
}
