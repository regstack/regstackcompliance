"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { createOutsourcingReport, approveOutsourcingReport } from "@/app/(app)/outsourcing/bericht/actions";
import type { OutsourcingReport } from "@/lib/regstack/outsourcing-reports";

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

function ReportRow({
  r,
  canApprove,
}: {
  r: OutsourcingReport;
  canApprove: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      try {
        await approveOutsourcingReport(r.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kenntnisnahme fehlgeschlagen.");
      }
    });
  }

  return (
    <>
      <tr className="border-b border-border-subtle last:border-0 align-top">
        <td className="px-3 py-2.5 font-medium text-foreground">{r.period}</td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          {r.format === "VORSTANDSSITZUNGSPROTOKOLL" ? "Vorstandssitzungsprotokoll" : "Schriftlicher Bericht"}
        </td>
        <td className="px-3 py-2.5">
          <StatusPill status={r.status === "GENEHMIGT" ? "genehmigt" : "entwurf"} label={r.status === "GENEHMIGT" ? "genehmigt" : "Entwurf"} />
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          {r.status === "GENEHMIGT" ? (
            <>Kenntnisnahme durch {r.approvedByName ?? "Geschäftsleitung"} am {r.approvedAt?.slice(0, 10)}</>
          ) : (
            "noch keine Kenntnisnahme"
          )}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-col items-start gap-1">
            <button type="button" className="text-xs text-copper-300 hover:underline" onClick={() => setOpen((v) => !v)}>
              {open ? "Details ausblenden" : "Details"}
            </button>
            <a href={`/outsourcing/bericht/${r.id}/pdf`} className="text-xs text-copper-300 hover:underline">
              PDF herunterladen
            </a>
          </div>
        </td>
        <td className="px-3 py-2.5">
          {canApprove && r.status === "ENTWURF" && (
            <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={approve}>
              Kenntnisnahme (Geschäftsleitung)
            </Button>
          )}
          {error && <p className="mt-1 text-[11px] text-status-danger">{error}</p>}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border-subtle last:border-0">
          <td colSpan={6} className="bg-surface-raised px-3 py-3">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vertragslage</dt>
                <dd className="mt-1 text-sm text-foreground">{r.conclusionContract}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Steuerbarkeit</dt>
                <dd className="mt-1 text-sm text-foreground">{r.conclusionSteuerbarkeit}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Maßnahmen</dt>
                <dd className="mt-1 text-sm text-foreground">{r.conclusionMassnahmen}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Einbezogene Auslagerungen</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {r.includedActivityNames.length === 0 ? "—" : r.includedActivityNames.join(", ")}
              </dd>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function BerichtePanel({ reports, canApprove }: { reports: OutsourcingReport[]; canApprove: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Periode</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Kenntnisnahme</th>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-3 py-2 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Noch kein Bericht über die Auslagerungen erstellt.
                </td>
              </tr>
            ) : (
              reports.map((r) => <ReportRow key={r.id} r={r} canApprove={canApprove} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function NewReportForm({
  activities,
}: {
  activities: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [conclusionContract, setConclusionContract] = useState("");
  const [conclusionSteuerbarkeit, setConclusionSteuerbarkeit] = useState("");
  const [conclusionMassnahmen, setConclusionMassnahmen] = useState("");
  const [includedActivityIds, setIncludedActivityIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Bericht erstellen
      </Button>
    );
  }

  function toggleActivity(id: string) {
    setIncludedActivityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    if (!period.trim() || !conclusionContract.trim() || !conclusionSteuerbarkeit.trim() || !conclusionMassnahmen.trim()) {
      setError("Periode und alle drei Pflichtaussagen (Tz. 13) sind erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createOutsourcingReport({ period, conclusionContract, conclusionSteuerbarkeit, conclusionMassnahmen, includedActivityIds });
        setOpen(false);
        setPeriod("");
        setConclusionContract("");
        setConclusionSteuerbarkeit("");
        setConclusionMassnahmen("");
        setIncludedActivityIds([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <label className={labelCls}>
          Periode
          <input className={inputCls} placeholder="z. B. 2026" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
        <label className={labelCls}>
          Vertragslage (Tz. 13 — Pflichtaussage 1)
          <textarea className={`${inputCls} min-h-20`} value={conclusionContract} onChange={(e) => setConclusionContract(e.target.value)} />
        </label>
        <label className={labelCls}>
          Steuerbarkeit (Tz. 13 — Pflichtaussage 2)
          <textarea className={`${inputCls} min-h-20`} value={conclusionSteuerbarkeit} onChange={(e) => setConclusionSteuerbarkeit(e.target.value)} />
        </label>
        <label className={labelCls}>
          Maßnahmen (Tz. 13 — Pflichtaussage 3)
          <textarea className={`${inputCls} min-h-20`} value={conclusionMassnahmen} onChange={(e) => setConclusionMassnahmen(e.target.value)} />
        </label>
        <div>
          <span className={labelCls}>Einbezogene Auslagerungen</span>
          <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border-subtle p-2">
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Auslagerungen im Register.</p>
            ) : (
              activities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={includedActivityIds.includes(a.id)} onChange={() => toggleActivity(a.id)} />
                  {a.name}
                </label>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" disabled={pending} onClick={save}>
            Als Entwurf anlegen
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
        {error && <p className="text-xs text-status-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
