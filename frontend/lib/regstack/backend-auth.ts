"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@/lib/supabase/server";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

export type BackendLoginResult =
  | { status: "ok" }
  | { status: "mfa_required"; mfaToken: string }
  | { status: "failed" };

function setBackendTokenCookie(token: string) {
  return cookies().then((store) =>
    store.set(BACKEND_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // matches the backend's JWT_EXPIRES_IN (8h)
    })
  );
}

/**
 * Best-effort exchange of the just-established Supabase session for an Express/Prisma backend
 * session. The two systems have separate user tables during this migration — not every
 * Supabase-authenticated user has a matching backend account yet — so a failure here is
 * swallowed rather than blocking sign-in: it just means backend-wired pages show a "not linked"
 * state for that user. The one case that is NOT swallowed is `mfa_required`: the backend account
 * has TOTP enabled (ADMIN/GESCHAEFTSLEITUNG only) and withheld the session token until a valid
 * code is presented via `completeTwoFactorLogin` — the caller (the login page) must ask for it
 * before treating sign-in as complete.
 *
 * This does not re-send the user's password: frontend and backend share JWT_SECRET, so a
 * short-lived token signed with it proves "Supabase already verified this email" to the
 * backend's /auth/exchange route, which looks up the matching account and issues its own
 * session token. That avoids keeping two password stores in sync.
 */
export async function loginToBackend(): Promise<BackendLoginResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { status: "failed" };

    const exchangeToken = jwt.sign({ email: user.email, purpose: "backend-exchange" }, process.env.JWT_SECRET!, {
      expiresIn: "60s",
    });

    const res = await fetch(`${BASE_URL}/auth/exchange`, {
      method: "POST",
      headers: { Authorization: `Bearer ${exchangeToken}` },
    });
    if (!res.ok) return { status: "failed" };

    const body = (await res.json()) as { token: string } | { mfaRequired: true; mfaToken: string };
    if ("mfaRequired" in body) return { status: "mfa_required", mfaToken: body.mfaToken };

    await setBackendTokenCookie(body.token);
    return { status: "ok" };
  } catch {
    // Backend unreachable — same graceful degradation as an auth failure.
    return { status: "failed" };
  }
}

/** Second step for an account with TOTP enabled — exchanges the mfaToken from loginToBackend()
 * plus the code from the user's authenticator app for the real backend session. */
export async function completeTwoFactorLogin(mfaToken: string, code: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/auth/login/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaToken, code }),
  });
  if (!res.ok) return false;

  const { token } = (await res.json()) as { token: string };
  await setBackendTokenCookie(token);
  return true;
}

export async function logoutFromBackend(): Promise<void> {
  (await cookies()).delete(BACKEND_TOKEN_COOKIE);
}
