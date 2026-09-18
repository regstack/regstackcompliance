"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@/lib/supabase/server";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

/**
 * Best-effort exchange of the just-established Supabase session for an Express/Prisma backend
 * session. The two systems have separate user tables during this migration — not every
 * Supabase-authenticated user has a matching backend account yet — so a failure here is
 * swallowed rather than blocking sign-in: it just means backend-wired pages show a "not linked"
 * state for that user.
 *
 * This does not re-send the user's password: frontend and backend share JWT_SECRET, so a
 * short-lived token signed with it proves "Supabase already verified this email" to the
 * backend's /auth/exchange route, which looks up the matching account and issues its own
 * session token. That avoids keeping two password stores in sync.
 */
export async function loginToBackend(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const exchangeToken = jwt.sign({ email: user.email, purpose: "backend-exchange" }, process.env.JWT_SECRET!, {
      expiresIn: "60s",
    });

    const res = await fetch(`${BASE_URL}/auth/exchange`, {
      method: "POST",
      headers: { Authorization: `Bearer ${exchangeToken}` },
    });
    if (!res.ok) return;

    const { token } = (await res.json()) as { token: string };
    (await cookies()).set(BACKEND_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // matches the backend's JWT_EXPIRES_IN (8h)
    });
  } catch {
    // Backend unreachable — same graceful degradation as an auth failure.
  }
}

export async function logoutFromBackend(): Promise<void> {
  (await cookies()).delete(BACKEND_TOKEN_COOKIE);
}
