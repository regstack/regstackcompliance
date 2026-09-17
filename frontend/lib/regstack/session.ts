import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type ModuleType = Database["public"]["Enums"]["module_type"];
export type InternalRole = Database["public"]["Enums"]["internal_role"];

export type SessionContext = {
  userId: string;
  email: string | null;
  personId: string;
  tenantId: string;
  fullName: string;
  roles: { module: ModuleType | null; role: InternalRole }[];
};

/**
 * Resolves the signed-in auth user to their Stammdaten (persons) record and
 * role assignments. proxy.ts already guarantees a session exists for any
 * route under (app), so a missing person record here means the user has an
 * auth account but no Stammdaten row yet (an admin needs to create one).
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: person } = await supabase
    .from("persons")
    .select("id, tenant_id, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!person) return null;

  const { data: roles } = await supabase
    .from("role_assignments")
    .select("module, role")
    .eq("person_id", person.id);

  return {
    userId: user.id,
    email: user.email ?? null,
    personId: person.id,
    tenantId: person.tenant_id,
    fullName: person.full_name,
    roles: roles ?? [],
  };
}

/** True if the person holds `role` for `module`, OR institution_admin anywhere. */
export function hasModuleRole(
  ctx: SessionContext,
  module: ModuleType,
  role: InternalRole
): boolean {
  return ctx.roles.some(
    (r) => r.role === "institution_admin" || (r.module === module && r.role === role)
  );
}

/** Outsourcing write access: power_user (data entry) or institution_admin. */
export function canWriteOutsourcing(ctx: SessionContext): boolean {
  return hasModuleRole(ctx, "outsourcing", "power_user");
}

/** Everyone with any outsourcing-module role (or admin) can read; RLS enforces row scope. */
export function hasOutsourcingAccess(ctx: SessionContext): boolean {
  return (
    ctx.roles.some((r) => r.role === "institution_admin") ||
    ctx.roles.some((r) => r.module === "outsourcing")
  );
}

/** Compliance write access: power_user (data entry) or institution_admin. */
export function canWriteCompliance(ctx: SessionContext): boolean {
  return hasModuleRole(ctx, "compliance", "power_user");
}

/** True if the person holds a `fachbereich` role for compliance — the Fachbereich side of a
 * Normzuweisung handshake (confirm/dispute an assignment, report `fachbereich_erledigt`). */
export function isComplianceFachbereich(ctx: SessionContext): boolean {
  return hasModuleRole(ctx, "compliance", "fachbereich");
}

/** Everyone with any compliance-module role (or admin) can read; RLS enforces row scope. */
export function hasComplianceAccess(ctx: SessionContext): boolean {
  return (
    ctx.roles.some((r) => r.role === "institution_admin") ||
    ctx.roles.some((r) => r.module === "compliance")
  );
}

/** Geschaeftsleitung is a tenant-wide role (module=null) — decides disputed Normzuweisungen,
 * gives quarterly-report Kenntnisnahme, accepts risk on a Feststellung. */
export function isGeschaeftsleitung(ctx: SessionContext): boolean {
  return ctx.roles.some((r) => r.role === "geschaeftsleitung");
}
