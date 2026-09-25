"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createUser, updateUser, type AdminUser } from "@/app/(app)/konto/nutzerverwaltung/actions";
import type { BackendRole } from "@/lib/regstack/backend-session";

const ROLE_LABELS: Record<BackendRole, string> = {
  GESCHAEFTSLEITUNG: "Geschäftsleitung",
  COMPLIANCE: "Compliance",
  RISIKOCONTROLLING: "Risikocontrolling",
  INTERNE_REVISION: "Interne Revision",
  AUSLAGERUNGSBEAUFTRAGTER: "Auslagerungsbeauftragter",
  BUCHHALTUNG: "Buchhaltung",
  ADMIN: "Admin",
  VIEWER: "Viewer (nur lesend)",
  PRUEFER: "Prüfer (nur lesend + Export)",
};
const ROLE_VALUES = Object.keys(ROLE_LABELS) as BackendRole[];

const inputCls =
  "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const selectCls = `${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`;

export function UserManagementPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveUser(id: string, patch: { role?: BackendRole; active?: boolean }) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateUser(id, patch);
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nutzer ({users.length})</CardTitle>
          <Button onClick={() => setCreating((v) => !v)} disabled={pending}>
            {creating ? "Abbrechen" : "Neuer Nutzer"}
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {creating && (
            <CreateUserForm
              onCreated={(user) => {
                setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)));
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
            />
          )}

          {error && <p className="text-xs text-status-danger">{error}</p>}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">E-Mail</th>
                  <th className="py-2 pr-3">Rolle</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">2FA</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="border-b border-border-subtle/60">
                      <td className="py-2 pr-3 font-medium text-foreground">
                        {u.name}
                        {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(Sie)</span>}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{u.email}</td>
                      <td className="py-2 pr-3">
                        <select
                          value={u.role}
                          disabled={pending}
                          onChange={(e) => saveUser(u.id, { role: e.target.value as BackendRole })}
                          className={selectCls}
                        >
                          {ROLE_VALUES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            u.active ? "bg-status-success-bg text-status-success" : "bg-graphite-800 text-graphite-300"
                          }`}
                        >
                          {u.active ? "Aktiv" : "Deaktiviert"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{u.totpEnabled ? "Ja" : "—"}</td>
                      <td className="py-2 text-right">
                        <Button
                          variant={u.active ? "danger" : "secondary"}
                          disabled={pending || isSelf}
                          title={isSelf ? "Sie können Ihr eigenes Konto nicht deaktivieren." : undefined}
                          onClick={() => saveUser(u.id, { active: !u.active })}
                        >
                          {u.active ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function CreateUserForm({ onCreated, onCancel }: { onCreated: (user: AdminUser) => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<BackendRole>("VIEWER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const user = await createUser({ email, name, role, password });
        onCreated(user);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-border-subtle bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} normal-case`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          E-Mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputCls} normal-case`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rolle
          <select value={role} onChange={(e) => setRole(e.target.value as BackendRole)} className={selectCls}>
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Initiales Passwort (min. 12 Zeichen)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} normal-case`}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Das Passwort wird nicht per E-Mail versendet — bitte sicher an die Person weitergeben; sie
        kann es später über die eigenen Kontoeinstellungen nicht selbst ändern (noch keine
        Self-Service-Funktion).
      </p>
      {error && <p className="text-xs text-status-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !email || !name || password.length < 12}>
          {pending ? "Wird angelegt…" : "Anlegen"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
