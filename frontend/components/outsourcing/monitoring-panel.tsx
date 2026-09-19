"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addMonitoringRecord } from "@/app/(app)/outsourcing/actions";
import { ASSURANCE_TYPES } from "@/lib/regstack/classification";
import type { MonitoringRecord } from "@/lib/regstack/outsourcing";

const emptyEvidence = {
  evidenceDate: "",
  evidenceDescription: "",
  assuranceType: ASSURANCE_TYPES[ASSURANCE_TYPES.length - 1] as string,
  bridgeCoverage: "",
  reviewerName: "",
  reviewedAt: "",
  materialChange: false,
  changeNote: "",
  escalationNeeded: false,
  escalationNote: "",
  assuranceReportDueDate: "",
};

const emptyKpi = { kpiName: "", kpiTarget: "", kpiAchieved: "", kpiComment: "" };

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("de-DE") : "–";
}

export function MonitoringPanel({
  activityId,
  records,
  canWrite,
}: {
  activityId: string;
  records: MonitoringRecord[];
  canWrite: boolean;
}) {
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [kpi, setKpi] = useState(emptyKpi);
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const evidenceLog = records.filter((r) => r.type === "EVIDENCE_LOG");
  const kpis = records.filter((r) => r.type === "KPI");
  const disabled = !canWrite || pending;

  function saveEvidence() {
    setError(null);
    if (!evidence.evidenceDate || !evidence.evidenceDescription) {
      setError("Datum und Beschreibung des Nachweises sind Pflicht.");
      return;
    }
    startTransition(async () => {
      try {
        await addMonitoringRecord(activityId, { type: "EVIDENCE_LOG", ...evidence });
        setEvidence(emptyEvidence);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function saveKpi() {
    setError(null);
    if (!kpi.kpiName) {
      setError("KPI-Name ist Pflicht.");
      return;
    }
    startTransition(async () => {
      try {
        await addMonitoringRecord(activityId, { type: "KPI", ...kpi });
        setKpi(emptyKpi);
        setShowKpiForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evidenz-Log (Tz. 9 — Pflichtbasis)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Pflichtbasis für alle Auslagerungen, unabhängig von der Wesentlichkeit. Jeder Eintrag
            wird unveränderlich protokolliert — ein neuer Nachweis ergänzt die Historie, statt den
            vorherigen zu überschreiben.
          </p>

          {evidenceLog.length > 0 && (
            <div className="space-y-2">
              {evidenceLog.map((r) => (
                <div key={r.id} className="rounded-md border border-border-subtle bg-graphite-900/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{fmt(r.evidenceDate)}</span>
                    {r.assuranceType && <span>{r.assuranceType}</span>}
                    {r.reviewerName && <span>Geprüft: {r.reviewerName} ({fmt(r.reviewedAt)})</span>}
                    {r.materialChange && <span className="text-status-warning">Wesentliche Änderung</span>}
                  </div>
                  <p className="mt-1 text-foreground">{r.evidenceDescription}</p>
                  {r.bridgeCoverage && <p className="mt-1 text-xs text-muted-foreground">Bridge-Letter: {r.bridgeCoverage}</p>}
                  {r.materialChange && r.changeNote && <p className="mt-1 text-xs text-status-warning">{r.changeNote}</p>}
                  {r.escalationNeeded && (
                    <p className="mt-1 text-xs text-status-danger">Eskalation erforderlich{r.escalationNote ? `: ${r.escalationNote}` : ""}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {evidenceLog.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Evidenz-Log-Eintrag erfasst.</p>}

          {canWrite && (
            <div className="space-y-3 border-t border-border-subtle pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Neuer Eintrag</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Datum des Nachweises
                  <input
                    type="date"
                    value={evidence.evidenceDate}
                    disabled={disabled}
                    onChange={(e) => setEvidence({ ...evidence, evidenceDate: e.target.value })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nachweistyp
                  <select
                    value={evidence.assuranceType}
                    disabled={disabled}
                    onChange={(e) => setEvidence({ ...evidence, assuranceType: e.target.value })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                  >
                    {ASSURANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Beschreibung
                <textarea
                  value={evidence.evidenceDescription}
                  disabled={disabled}
                  rows={2}
                  onChange={(e) => setEvidence({ ...evidence, evidenceDescription: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bridge-Letter-Abdeckung (falls Berichtsstichtag ≠ Geschäftsjahresende)
                <input
                  value={evidence.bridgeCoverage}
                  disabled={disabled}
                  placeholder="z. B. deckt 01.2025–12.2025 ab"
                  onChange={(e) => setEvidence({ ...evidence, bridgeCoverage: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Geprüft durch
                  <input
                    value={evidence.reviewerName}
                    disabled={disabled}
                    onChange={(e) => setEvidence({ ...evidence, reviewerName: e.target.value })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Datum der Durchsicht
                  <input
                    type="date"
                    value={evidence.reviewedAt}
                    disabled={disabled}
                    onChange={(e) => setEvidence({ ...evidence, reviewedAt: e.target.value })}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={evidence.materialChange}
                  disabled={disabled}
                  onChange={(e) => setEvidence({ ...evidence, materialChange: e.target.checked })}
                />
                Wesentliche Änderung seit letzter Durchsicht?
              </label>
              {evidence.materialChange && (
                <textarea
                  value={evidence.changeNote}
                  disabled={disabled}
                  rows={2}
                  placeholder="Beschreibung der Änderung"
                  onChange={(e) => setEvidence({ ...evidence, changeNote: e.target.value })}
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50"
                />
              )}
              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={evidence.escalationNeeded}
                  disabled={disabled}
                  onChange={(e) => setEvidence({ ...evidence, escalationNeeded: e.target.checked })}
                />
                Eskalation erforderlich?
              </label>
              {evidence.escalationNeeded && (
                <textarea
                  value={evidence.escalationNote}
                  disabled={disabled}
                  rows={2}
                  placeholder="Eskalationsnotiz"
                  onChange={(e) => setEvidence({ ...evidence, escalationNote: e.target.value })}
                  className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50"
                />
              )}
              <Button onClick={saveEvidence} disabled={disabled} className="px-2.5 py-1 text-xs">
                {pending ? "Speichert…" : "Eintrag hinzufügen"}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KPI-Tracker (optional)</CardTitle>
          {canWrite && (
            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setShowKpiForm(!showKpiForm)}>
              + KPI hinzufügen
            </Button>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {kpis.length === 0 && !showKpiForm && <p className="text-sm text-muted-foreground">Kein KPI-Tracking erfasst.</p>}

          {kpis.map((k) => (
            <div key={k.id} className="grid gap-2 rounded-md border border-border-subtle bg-graphite-900/60 p-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">KPI</div>
                {k.kpiName}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Ziel</div>
                {k.kpiTarget ?? "–"}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Erreicht</div>
                {k.kpiAchieved ?? "–"}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Kommentar</div>
                {k.kpiComment ?? "–"}
              </div>
            </div>
          ))}

          {showKpiForm && (
            <div className="grid gap-2 rounded-md border border-border-strong bg-graphite-950 p-3 sm:grid-cols-4">
              <input
                value={kpi.kpiName}
                disabled={disabled}
                placeholder="KPI-Name"
                onChange={(e) => setKpi({ ...kpi, kpiName: e.target.value })}
                className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
              />
              <input
                value={kpi.kpiTarget}
                disabled={disabled}
                placeholder="Zielwert"
                onChange={(e) => setKpi({ ...kpi, kpiTarget: e.target.value })}
                className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
              />
              <input
                value={kpi.kpiAchieved}
                disabled={disabled}
                placeholder="Erreicht"
                onChange={(e) => setKpi({ ...kpi, kpiAchieved: e.target.value })}
                className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
              />
              <input
                value={kpi.kpiComment}
                disabled={disabled}
                placeholder="Kommentar"
                onChange={(e) => setKpi({ ...kpi, kpiComment: e.target.value })}
                className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground disabled:opacity-50"
              />
              <Button className="col-span-full px-2.5 py-1 text-xs" disabled={disabled} onClick={saveKpi}>
                Speichern
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
