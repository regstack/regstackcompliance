"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { AccessGrant } from "@/lib/regstack/access-grants";

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";

function statusPillProps(status: AccessGrant["status"] | undefined): { status: string; label: string } {
  switch (status) {
    case "APPROVED":
      return { status: "bestaetigt", label: "genehmigt" };
    case "PENDING":
      return { status: "offen", label: "angefragt — Entscheidung ausstehend" };
    case "DENIED":
      return { status: "abgelehnt", label: "abgelehnt" };
    case "REVOKED":
      return { status: "beendet", label: "entzogen" };
    default:
      return { status: "open", label: "noch nicht angefragt" };
  }
}

function fmt(dt: string | null): string {
  return dt ? dt.slice(0, 10) : "—";
}

/**
 * Shared display + action card for one module's ModuleAccessGrant — reused by the requesting
 * (Interne Revision) page and both approving (Outsourcing/Compliance) pages. Which buttons render
 * depends only on which action props are passed: a page that can request passes `onRequest`, a
 * page that can decide passes `onApprove`/`onDeny`/`onRevoke`. All are Server Actions.
 */
export function GrantCard({
  title,
  basis,
  grant,
  requestedByName,
  decidedByName,
  onRequest,
  onApprove,
  onDeny,
  onRevoke,
}: {
  title: string;
  basis?: string;
  grant: AccessGrant | undefined;
  requestedByName?: string | null;
  decidedByName?: string | null;
  onRequest?: (reason: string) => Promise<void>;
  onApprove?: () => Promise<void>;
  onDeny?: (note: string) => Promise<void>;
  onRevoke?: (note: string) => Promise<void>;
}) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [noteOpen, setNoteOpen] = useState<"deny" | "revoke" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pill = statusPillProps(grant?.status);
  const canShowRequest = onRequest && grant?.status !== "APPROVED" && grant?.status !== "PENDING";

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setReasonOpen(false);
        setReason("");
        setNoteOpen(null);
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <StatusPill status={pill.status} label={pill.label} />
      </CardHeader>
      <CardBody className="space-y-3">
        {basis && <p className="text-xs text-muted-foreground">{basis}</p>}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Angefragt</dt>
            <dd className="mt-0.5 text-foreground">
              {grant?.requestedAt ? `${requestedByName ?? "—"} am ${fmt(grant.requestedAt)}` : "—"}
            </dd>
            {grant?.reason && <dd className="mt-0.5 text-xs text-muted-foreground">Begründung: {grant.reason}</dd>}
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entschieden</dt>
            <dd className="mt-0.5 text-foreground">
              {grant?.decidedAt ? `${decidedByName ?? "—"} am ${fmt(grant.decidedAt)}` : "—"}
            </dd>
            {grant?.decisionNote && <dd className="mt-0.5 text-xs text-muted-foreground">Hinweis: {grant.decisionNote}</dd>}
          </div>
        </dl>

        {canShowRequest && (
          <div className="border-t border-border-subtle pt-3">
            {!reasonOpen ? (
              <Button variant="primary" onClick={() => setReasonOpen(true)}>
                Zugriff anfragen
              </Button>
            ) : (
              <div className="space-y-2">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Begründung (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button variant="primary" disabled={pending} onClick={() => run(() => onRequest!(reason))}>
                    Anfrage senden
                  </Button>
                  <Button variant="ghost" onClick={() => setReasonOpen(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {(onApprove || onDeny || onRevoke) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
            {onApprove && grant?.status === "PENDING" && (
              <Button variant="primary" disabled={pending} onClick={() => run(() => onApprove())}>
                Genehmigen
              </Button>
            )}
            {onDeny && grant?.status === "PENDING" && noteOpen !== "deny" && (
              <Button variant="secondary" disabled={pending} onClick={() => setNoteOpen("deny")}>
                Ablehnen
              </Button>
            )}
            {onRevoke && grant?.status === "APPROVED" && noteOpen !== "revoke" && (
              <Button variant="danger" disabled={pending} onClick={() => setNoteOpen("revoke")}>
                Zugriff entziehen
              </Button>
            )}
            {noteOpen && (
              <div className="w-full space-y-2">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Hinweis zur Entscheidung (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant={noteOpen === "revoke" ? "danger" : "secondary"}
                    disabled={pending}
                    onClick={() => run(() => (noteOpen === "deny" ? onDeny! : onRevoke!)(note))}
                  >
                    {noteOpen === "deny" ? "Ablehnung bestätigen" : "Entzug bestätigen"}
                  </Button>
                  <Button variant="ghost" onClick={() => setNoteOpen(null)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
            {!grant && <p className="text-xs text-muted-foreground">Noch keine Anfrage der Internen Revision vorhanden.</p>}
          </div>
        )}

        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
