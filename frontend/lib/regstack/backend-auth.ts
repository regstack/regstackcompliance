"use server";

import { cookies } from "next/headers";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";

/**
 * Best-effort login against the Express/Prisma backend, using the same credentials the user
 * just gave Supabase Auth. The two systems have separate user tables during this migration —
 * not every Supabase-authenticated user has a matching backend account yet — so a failure here
 * is swallowed rather than blocking sign-in: it just means the Outsourcing pages (the only
 * module wired to the new backend so far) show a "not linked" state for that user.
 */
export async function loginToBackend(email: string, password: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
