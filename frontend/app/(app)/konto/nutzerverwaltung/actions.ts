"use server";

import { apiFetch } from "@/lib/regstack/backend-client";
import type { BackendRole } from "@/lib/regstack/backend-session";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: BackendRole;
  active: boolean;
  createdAt: string;
  totpEnabled: boolean;
}

export async function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>("/users/admin");
}

export async function createUser(input: { email: string; name: string; role: BackendRole; password: string }): Promise<AdminUser> {
  return apiFetch<AdminUser>("/users/admin", { method: "POST", body: JSON.stringify(input) });
}

export async function updateUser(id: string, input: { name?: string; role?: BackendRole; active?: boolean }): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/admin/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}
