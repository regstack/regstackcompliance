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
