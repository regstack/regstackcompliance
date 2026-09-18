"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { RISK_CRITERIA, riskScore, type Risikokriterien } from "@/lib/regstack/revisions-utils";
import { RATING_OPTS, riskReviewDue } from "@/lib/regstack/revisions-universum";
import { updateUniversumRisk, updateUniversumRiskReview } from "@/app/(app)/interne-revision/pruefungsuniversum/actions";

type RiskRationale = Partial<Record<"potenzial" | "veraenderung" | "quellen" | "manipulation", string>>;

export function RiskForm({
  universumId, initialRisk, initialRationale, initialReviewDate, initialReviewerId, personen, canWrite, riskIntervalMonate,
}: {
  universumId: string;
  initialRisk: Risikokriterien;
  initialRationale: RiskRationale;
  initialReviewDate: string | null;
  initialReviewerId: string | null;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
  riskIntervalMonate: number;
}) {
  const [risk, setRisk] = useState<Risikokriterien>(initialRisk);
  const [rationale, setRationale] = useState<RiskRationale>(initialRationale);
  const [reviewDate, setReviewDate] = useState(initialReviewDate ?? "");
  const [reviewerId, setReviewerId] = useState(initialReviewerId ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const disabled = !canWrite || pending;
  const score = riskScore(risk);
  const today = new Date().toISOString().slice(0, 10);
  const due = reviewRuleDue(reviewDate, riskIntervalMonate, today);

  function reviewRuleDue(date: string, months: number, todayStr: string) {
    return riskReviewDue(date || null, months, todayStr);
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateUniversumRisk(universumId, risk, rationale);
        await updateUniversumRiskReview(universumId, reviewDate || null, reviewerId || null);
        setDirty(false);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risikobewertung (Tz. 6 S.2)</CardTitle>
        {score !== null && <StatusPill status="open" label={`Risikoscore ${score}`} />}
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Je Kriterium ist neben der Stufe eine <strong className="text-foreground">Begründung</strong> zu erfassen — die
          Frage &bdquo;warum ist dieses Objekt so eingestuft?&ldquo; muss datiert und mit benanntem Bewerter beantwortbar sein.
        </p>

        {RISK_CRITERIA.map((c) => {
          const rr = rationale[c.id] ?? "";
          return (
            <div key={c.id} className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {c.label}
                <select
                  value={risk[c.id] ?? ""}
                  disabled={disabled}
                  onChange={(e) => { setRisk((r) => ({ ...r, [c.id]: e.target.value ? Number(e.target.value) : undefined })); setDirty(true); }}
                  className={input}
                >
                  {RATING_OPTS.map((o) => <option key={String(o.v)} value={o.v}>{o.l}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Begründung{!rr && <span className="text-status-danger"> — fehlt</span>}
                <input
                  placeholder="Warum diese Stufe?"
                  value={rr}
                  disabled={disabled}
                  onChange={(e) => { setRationale((r) => ({ ...r, [c.id]: e.target.value })); setDirty(true); }}
                  className={input}
                />
              </label>
            </div>
          );
        })}

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Überprüft am <span className="normal-case font-normal">Tz. 6 S.3</span>
            <input type="date" value={reviewDate} disabled={disabled}
              onChange={(e) => { setReviewDate(e.target.value); setDirty(true); }} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Überprüft durch
            <select value={reviewerId} disabled={disabled}
              onChange={(e) => { setReviewerId(e.target.value); setDirty(true); }} className={input}>
              <option value="">—</option>
              {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Nächste Überprüfung
            <span className="pt-1">
              {reviewDate
                ? <StatusPill status={due ? "unzureichend" : "gut"} label={due ? "überfällig" : "im Turnus"} />
                : <StatusPill status="verbesserungsbeduerftig" label="keine Bewertung dokumentiert" />}
            </span>
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-3 pt-1">
            <Button className="px-3 py-1.5 text-xs" disabled={!dirty || pending} onClick={save}>
              {pending ? "Speichert…" : "Risikobewertung speichern"}
            </Button>
            {saved && !dirty && <span className="text-xs text-status-success">Gespeichert.</span>}
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
