import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

// Mirrors the Prisma `Role` enum in prisma/schema.prisma — the Express backend's flat,
// one-role-per-user model. This is intentionally NOT the same shape as the Supabase-based
// per-module `internal_role`/`module_type` roles in lib/regstack/session.ts: only the
// Outsourcing module talks to the new backend so far, so only Outsourcing reads this.
export type BackendRole =
  | "GESCHAEFTSLEITUNG"
  | "COMPLIANCE"
  | "RISIKOCONTROLLING"
  | "INTERNE_REVISION"
  | "AUSLAGERUNGSBEAUFTRAGTER"
  | "ADMIN"
  | "VIEWER";

export type BackendSession = {
  userId: string;
  institutionId: string;
  role: BackendRole;
  name: string;
};

/**
 * Decodes and verifies the backend's own JWT (shared JWT_SECRET). Returns null if the cookie is
 * missing, expired, or invalid — e.g. a Supabase-authenticated user with no matching backend
 * account. Real authorization is still enforced by the Express API on every request (rbac.ts);
 * this is only used to drive what the Outsourcing UI shows.
 */
export async function getBackendSession(): Promise<BackendSession | null> {
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as BackendSession;
  } catch {
    return null;
  }
}

// Mirrors src/middleware/rbac.ts's MATRIX.outsourcingActivity.write — kept in sync manually
// since the UI-side check is only a convenience; the real check runs server-side on every write.
const OUTSOURCING_WRITE_ROLES: BackendRole[] = [
  "COMPLIANCE",
  "RISIKOCONTROLLING",
  "AUSLAGERUNGSBEAUFTRAGTER",
  "ADMIN",
];

export function canWriteOutsourcing(role: BackendRole): boolean {
  return OUTSOURCING_WRITE_ROLES.includes(role);
}
