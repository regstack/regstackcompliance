"use server";

import { apiFetch } from "@/lib/regstack/backend-client";

export interface TwoFactorStatus {
  totpEnabled: boolean;
  eligible: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>("/users/me/2fa/status");
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetup> {
  return apiFetch<TwoFactorSetup>("/users/me/2fa/setup", { method: "POST" });
}

export async function confirmTwoFactorSetup(code: string): Promise<void> {
  await apiFetch("/users/me/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
}

export async function disableTwoFactor(code: string): Promise<void> {
  await apiFetch("/users/me/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });
}
