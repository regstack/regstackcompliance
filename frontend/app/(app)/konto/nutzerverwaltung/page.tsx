import { redirect } from "next/navigation";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { listUsers } from "./actions";
import { UserManagementPanel } from "@/components/konto/user-management-panel";

// requirePermission("user", "read"/"write") on the backend is the real boundary (userAdmin.routes.ts)
// -- this redirect is only so a non-Admin doesn't land on a page that will just show fetch errors.
export default async function NutzerverwaltungPage() {
  const session = await getBackendSession();
  if (!session || session.role !== "ADMIN") redirect("/konto");

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-foreground">Nutzerverwaltung</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konten für dieses Institut anlegen, Rollen ändern oder deaktivieren. Jede Änderung wird
          im Audit-Trail protokolliert.
        </p>
      </div>

      <UserManagementPanel initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
