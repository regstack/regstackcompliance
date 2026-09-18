"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { ASSIGN_ROLES, activeBar, type Sperrfrist } from "@/lib/regstack/revisions-universum";
import { Pill } from "@/components/revisions/pruefungen/pill";
import { addZuweisung, removeZuweisung } from "@/app/(app)/interne-revision/pruefungen/actions";

export type Zuweisung = { id: string; person_id: string; role: string; person: { full_name: string } | null };

export function ZuweisungenPanel({
  pruefungId, assignments, personen, sperrfristen, canWrite,
}: {
  pruefungId: string;
  assignments: Zuweisung[];
  personen: { id: string; full_name: string }[];
  sperrfristen: Sperrfrist[];
  canWrite: boolean;
}) {
  const [personId, setPersonId] = useState(personen[0]?.id ?? "");
  const [role, setRole] = useState<string>(ASSIGN_ROLES[0].v);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const conflicts = assignments
    .map((a) => ({ a, bar: activeBar(a.person_id, sperrfristen, today) }))
    .filter((x) => x.bar);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen."); }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Prüferzuweisung</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Tz. 4 — keine Prüfung des eigenen früheren Verantwortungsbereichs innerhalb der Sperrfrist; Grundlage für das
          Vier-Augen-Prinzip bei der Freigabe der Arbeitspapiere.
        </p>

        {conflicts.length > 0 && (
          <div className="mb-3">
            <Banner tone="crit" title="Prüferzuweisung trotz laufender Sperrfrist (Warnung, keine harte Sperre)">
              {conflicts.map(({ a, bar }) => `${a.person?.full_name ?? "—"} (gesperrt bis ${bar?.bar_end_date}, Bereich: ${bar?.barred_areas ?? "—"})`).join("; ")}
            </Banner>
          </div>
        )}

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Prüfer zugewiesen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Rolle</th>
                  <th className="px-3 py-2 font-medium">Sperrfrist</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const bar = activeBar(a.person_id, sperrfristen, today);
                  return (
                    <tr key={a.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-3 py-2.5 text-foreground">{a.person?.full_name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{ASSIGN_ROLES.find((r) => r.v === a.role)?.l ?? a.role}</td>
                      <td className="px-3 py-2.5">
                        {bar ? <Pill tone="danger">gesperrt bis {bar.bar_end_date}</Pill> : <Pill tone="success">frei</Pill>}
                      </td>
                      <td className="px-3 py-2.5">
                        {canWrite && (
                          <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending}
                            onClick={() => run(() => removeZuweisung(a.id, pruefungId))}>
                            entfernen
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canWrite && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={personId} onChange={(e) => setPersonId(e.target.value)}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground">
              {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground">
              {ASSIGN_ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
            <Button className="px-2.5 py-1 text-xs" disabled={pending || !personId}
              onClick={() => run(() => addZuweisung(pruefungId, personId, role))}>
              + Prüfer zuweisen
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
