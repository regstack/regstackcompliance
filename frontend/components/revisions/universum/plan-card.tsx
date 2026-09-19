"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createAuditPlan, updateAuditPlanContent, addPlanAdjustment, submitAuditPlan, approveAuditPlan,
  type PlanContent, type PlanAdjustment,
} from "@/app/(app)/interne-revision/pruefungsuniversum/actions";

export type AuditPlanRow = {
  id: string;
  year: number;
  content: unknown;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  approver: { full_name: string } | null;
  creator: { full_name: string } | null;
};

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-2 text-xs text-status-danger">{error}</p>;
}

function AdjustmentForm({ planId, current, onDone }: { planId: string; current: PlanContent; onDone: () => void }) {
  const [entry, setEntry] = useState<PlanAdjustment>({ date: new Date().toISOString().slice(0, 10), desc: "", approvedBy: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addPlanAdjustment(planId, current, entry);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" value={entry.date} disabled={pending} onChange={(e) => setEntry((f) => ({ ...f, date: e.target.value }))} className={input} aria-label="Datum" />
        <input placeholder="Beschreibung der Anpassung" value={entry.desc} disabled={pending}
          onChange={(e) => setEntry((f) => ({ ...f, desc: e.target.value }))} className={input} aria-label="Beschreibung der Anpassung" />
        <input placeholder="Genehmigt durch" value={entry.approvedBy} disabled={pending}
          onChange={(e) => setEntry((f) => ({ ...f, approvedBy: e.target.value }))} className={input} aria-label="Genehmigt durch" />
      </div>
      <ErrorText error={error} />
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !entry.desc.trim()} onClick={submit}>Protokollieren</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ActivePlan({
  plan, plannedDays, canWrite, isGL,
}: {
  plan: AuditPlanRow; plannedDays: number; canWrite: boolean; isGL: boolean;
}) {
  const rawContent = (plan.content ?? {}) as Partial<PlanContent>;
  const content: PlanContent = { kapazitaetPT: rawContent.kapazitaetPT ?? 0, adjustments: rawContent.adjustments ?? [] };
  const [kapazitaet, setKapazitaet] = useState(content.kapazitaetPT);
  const [dirty, setDirty] = useState(false);
  const [addingAdjustment, setAddingAdjustment] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEntwurf = plan.status === "entwurf";
  const editableCapacity = canWrite && isEntwurf;
  const kapazitaetOver = kapazitaet > 0 && plannedDays > kapazitaet;
  const auslastung = kapazitaet > 0 ? Math.round((100 * plannedDays) / kapazitaet) : null;

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  function saveKapazitaet() {
    run(async () => {
      await updateAuditPlanContent(plan.id, { ...content, kapazitaetPT: kapazitaet });
      setDirty(false);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jahresplan {plan.year}</CardTitle>
        <StatusPill status={plan.status} label={plan.status === "entwurf" ? "Entwurf" : plan.status === "eingereicht" ? "eingereicht" : "genehmigt"} />
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Tz. 6 S.4 — Prüfungsplanung sowie wesentliche Anpassungen sind von der Geschäftsleitung zu genehmigen. Nach der
          Genehmigung ist der Plan-Datensatz unveränderlich; weitere Änderungen laufen über protokollierte Anpassungen.
        </p>

        <h3 className="mb-2 text-[13px] font-semibold text-foreground">
          Kapazitätsplanung <span className="text-xs font-normal text-muted-foreground">Grundlage der Planeinhaltungs-Beurteilung nach Tz. 9</span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Verfügbare Revisionskapazität (PT)
            <input type="number" value={kapazitaet} disabled={!editableCapacity || pending}
              onChange={(e) => { setKapazitaet(Number(e.target.value)); setDirty(true); }}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Geplanter Aufwand (Summe Budget)
            <span className="pt-1"><StatusPill status={kapazitaetOver ? "unzureichend" : "gut"} label={`${plannedDays} PT`} /></span>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Auslastung
            <span className="pt-1">
              {auslastung === null
                ? <StatusPill status="offen" label="keine Kapazität hinterlegt" />
                : <StatusPill status={kapazitaetOver ? "unzureichend" : auslastung > 85 ? "verbesserungsbeduerftig" : "gut"} label={`${auslastung} %`} />}
            </span>
          </label>
        </div>
        {editableCapacity && (
          <div className="mt-2 flex items-center gap-2">
            <Button className="px-2.5 py-1 text-xs" disabled={!dirty || pending} onClick={saveKapazitaet}>
              {pending ? "Speichert…" : "Kapazität speichern"}
            </Button>
            {dirty && !pending && <span className="text-xs text-status-warning">Ungespeichert</span>}
          </div>
        )}
        {!canWrite && <p className="mt-2 text-xs text-muted-foreground">Kapazitätsfelder sind nur mit Schreibrecht bearbeitbar.</p>}

        {content.adjustments.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wesentliche Anpassungen</h4>
            <div className="space-y-1">
              {content.adjustments.map((a, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">{a.date}</span> — {a.desc} — genehmigt durch <span className="text-foreground">{a.approvedBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {canWrite && (
          addingAdjustment ? (
            <AdjustmentForm planId={plan.id} current={content} onDone={() => setAddingAdjustment(false)} />
          ) : (
            <Button variant="secondary" className="mt-3 px-2.5 py-1 text-xs" onClick={() => setAddingAdjustment(true)}>
              + Wesentliche Anpassung protokollieren
            </Button>
          )
        )}

        <div className="mt-4 rounded-md border border-copper-500/20 bg-copper-700/10 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Sonderprüfungen:</strong> kurzfristig notwendige Sonderprüfungen müssen jederzeit
          möglich sein (Tz. 6 S.6) — unabhängig von diesem genehmigten Plan.
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canWrite && isEntwurf && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => submitAuditPlan(plan.id))}>
              Zur Genehmigung einreichen
            </Button>
          )}
          {plan.status === "eingereicht" && isGL && (
            <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => approveAuditPlan(plan.id))}>
              Als Geschäftsleitung genehmigen
            </Button>
          )}
          {plan.status === "eingereicht" && !isGL && (
            <span className="text-xs text-muted-foreground">Zur Genehmigung eingereicht — wartet auf die Geschäftsleitung.</span>
          )}
          {plan.status === "genehmigt" && (
            <span className="text-xs text-muted-foreground">
              Genehmigt durch {plan.approver?.full_name ?? "—"} am {plan.approved_at?.slice(0, 10)} — unveränderlich.
            </span>
          )}
        </div>
        <ErrorText error={error} />
      </CardBody>
    </Card>
  );
}

export function PlanCard({
  plans, year, plannedDays, canWrite, isGL,
}: {
  plans: AuditPlanRow[]; year: number; plannedDays: number; canWrite: boolean; isGL: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const currentPlan = plans.find((p) => p.year === year);
  const otherPlans = plans.filter((p) => p.year !== year);

  if (!currentPlan) {
    return (
      <Card>
        <CardHeader><CardTitle>Jahresplan {year}</CardTitle></CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-muted-foreground">Für {year} wurde noch kein Jahresplan angelegt.</p>
          {canWrite && (
            <Button
              className="px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await createAuditPlan(year);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
                  }
                });
              }}
            >
              {pending ? "Legt an…" : `Jahresplan ${year} anlegen`}
            </Button>
          )}
          <ErrorText error={error} />
          {otherPlans.length > 0 && (
            <div className="mt-4 space-y-1">
              {otherPlans.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{p.year}</span>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <ActivePlan plan={currentPlan} plannedDays={plannedDays} canWrite={canWrite} isGL={isGL} />
      {otherPlans.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 text-xs text-muted-foreground">
          {otherPlans.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5">
              {p.year} <StatusPill status={p.status} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
