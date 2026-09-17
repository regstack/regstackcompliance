import { cookies } from "next/headers";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:4000/api";
export const BACKEND_TOKEN_COOKIE = "regstack_backend_token";

export class BackendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Server-side only — attaches the Express backend's JWT (if present) as a Bearer token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body.error ?? `Backend-Fehler (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
