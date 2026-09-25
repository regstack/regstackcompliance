import { redirect } from "next/navigation";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { listUsers } from "./actions";
import { UserManagementPanel } from "@/components/konto/user-management-panel";

// requirePermission("user", "read"/"write") on the backend is the real boundary (userAdmin.routes.ts)
// -- this redirect just keeps everyone else off a page that would only show fetch errors.
// GESCHAEFTSLEITUNG has read access on the backend (MATRIX.user.read) but not write, so it gets
// the list in read-only mode; only ADMIN can create/edit/deactivate.
export default async function NutzerverwaltungPage() {
  const session = await getBackendSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "GESCHAEFTSLEITUNG")) redirect("/konto");

  const users = await listUsers();
  const canWrite = session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-foreground">Nutzerverwaltung</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canWrite
            ? "Konten für dieses Institut anlegen, Rollen ändern oder deaktivieren. Jede Änderung wird im Audit-Trail protokolliert."
            : "Konten für dieses Institut (nur lesend — Änderungen sind Admin vorbehalten)."}
        </p>
      </div>

      <UserManagementPanel initialUsers={users} currentUserId={session.userId} canWrite={canWrite} />
    </div>
  );
}
