"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { finalizeReport, ackReportRecipient } from "@/app/(app)/compliance/actions";
import { asContent } from "@/lib/regstack/compliance-utils";

type Report = {
  id: string; report_type: string; period_from: string | null; period_to: string | null; status: string;
  content: unknown; finalized_at: string | null; kenntnisnahme_at: string | null;
};

const TYPE_LABEL: Record<string, string> = { quartalsbericht: "Quartal", jahresbericht: "Jahr", anlassbericht: "Anlassbezogen" };

function Row({ r, canFinalize, canAck }: { r: Report; canFinalize: boolean; canAck: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const content = asContent(r.content);
  const [selected, setSelected] = useState(content.recipients?.find((x) => !x.ack_at)?.name ?? "");

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen."); }
    });
  }

  const openRecipients = content.recipients?.filter((x) => !x.ack_at) ?? [];

  return (
    <tr className="border-b border-border-subtle last:border-0 align-top">
      <td className="px-3 py-2.5 font-medium text-foreground">{content.name ?? r.report_type}</td>
      <td className="px-3 py-2.5"><StatusPill status="open" label={TYPE_LABEL[r.report_type] ?? r.report_type} /></td>
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.period_from} – {r.period_to}</td>
      <td className="px-3 py-2.5"><StatusPill status={r.status} /></td>
      <td className="px-3 py-2.5">
        {(content.recipients ?? []).map((rec) => (
          <div key={rec.name} className="mb-1 flex items-center gap-1.5 last:mb-0">
            <span className="text-xs text-muted-foreground">{rec.name}</span>
            <StatusPill status={rec.ack_at ? "bestaetigt" : "offen"} label={rec.ack_at ?? "ausstehend"} />
          </div>
        ))}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{content.weiterleitung_revision ?? "—"}</td>
      <td className="px-3 py-2.5">
        {canFinalize && r.status === "entwurf" && (
          <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => finalizeReport(r.id))}>Finalisieren</Button>
        )}
        {canAck && r.status === "final" && openRecipients.length > 0 && (
          <div className="flex items-center gap-1">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-md border border-border-strong bg-surface px-1.5 py-1 text-[11px] text-foreground">
              {openRecipients.map((rec) => <option key={rec.name} value={rec.name}>{rec.name}</option>)}
            </select>
            <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending || !selected} onClick={() => run(() => ackReportRecipient(r.id, selected))}>
              Kenntnisnahme
            </Button>
          </div>
        )}
        {error && <p className="mt-1 text-[11px] text-status-danger">{error}</p>}
      </td>
    </tr>
  );
}

export function ReportsPanel({ reports, canFinalize, canAck }: { reports: Report[]; canFinalize: boolean; canAck: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Bericht</th><th className="px-3 py-2 font-medium">Typ</th>
                <th className="px-3 py-2 font-medium">Zeitraum</th><th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Kenntnisnahme je Empfänger</th><th className="px-3 py-2 font-medium">Interne Revision</th>
                <th className="px-3 py-2 font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody>{reports.map((r) => <Row key={r.id} r={r} canFinalize={canFinalize} canAck={canAck} />)}</tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
