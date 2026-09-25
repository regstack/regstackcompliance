"use server";

import { decideAccessGrant } from "@/lib/regstack/access-grant-actions";

export async function approveItRisikoAccessGrant() {
  await decideAccessGrant("IT_RISIKO", "approve");
}
export async function denyItRisikoAccessGrant(note?: string) {
  await decideAccessGrant("IT_RISIKO", "deny", note);
}
export async function revokeItRisikoAccessGrant(note?: string) {
  await decideAccessGrant("IT_RISIKO", "revoke", note);
}
