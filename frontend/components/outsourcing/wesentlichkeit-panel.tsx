"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { saveRiskAnalysis, type RiskAnalysisInput } from "@/app/(app)/outsourcing/actions";
import type { RiskAnalysis } from "@/lib/regstack/outsourcing";
import type { InstitutionSettings } from "@/lib/regstack/institution";
import { QUICK_TRIGGERS } from "@/lib/regstack/classification";
import { MATERIALITY_CRITERIA, EXTENSIVE_IMPACT_CRITERIA, RATING_OPTS, CRITICALITY_OPTS, previewCscClassification } from "@/lib/regstack/csc-criteria";
import { PROVIDER_CRITERIA, PROVIDER_DEEP_CRITERIA, previewTeslaClassification } from "@/lib/regstack/tesla-criteria";

type Criticality = RiskAnalysis["criticality"];

type FormState = {
  quickTriggers: Record<string, boolean>;
  materialityRatings: Record<string, string>;
  secondDimensionRatings: Record<string, string>;
  criticality: Criticality;
  criticalityReason: string;
  overrideActive: boolean;
  overrideMaterial: boolean | null;
  overrideReason: string;
  overrideApprover: string;
};

function toRatingRecord(ratings: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ratings)) {
    if (v !== "") out[k] = Number(v);
  }
  return out;
}

function initialState(initial: RiskAnalysis | null): FormState {
  const toStrings = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)]));
  return {
    quickTriggers: initial?.quickTriggers ?? {},
    materialityRatings: toStrings(initial?.materialityRatings ?? {}),
    secondDimensionRatings: toStrings(initial?.secondDimensionRatings ?? {}),
    criticality: initial?.criticality ?? "OFFEN",
    criticalityReason: initial?.criticalityReason ?? "",
    overrideActive: initial?.overrideActive ?? false,
    overrideMaterial: initial?.overrideMaterial ?? null,
    overrideReason: initial?.overrideReason ?? "",
    overrideApprover: initial?.overrideApprover ?? "",
  };
}

export function WesentlichkeitPanel({
  activityId,
  initial,
  deepDive,
  institution,
  canWrite,
}: {
  activityId: string;
  initial: RiskAnalysis | null;
  deepDive: boolean;
  institution: InstitutionSettings;
  canWrite: boolean;
}) {
  const [f, setF] = useState<FormState>(initialState(initial));
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = !canWrite || pending;

  const isCsc = institution.calculationModel === "CSC";
  const secondDimensionCriteria = isCsc
    ? EXTENSIVE_IMPACT_CRITERIA
    : deepDive
      ? [...PROVIDER_CRITERIA, ...PROVIDER_DEEP_CRITERIA]
      : PROVIDER_CRITERIA;
  const secondDimensionLabel = isCsc ? "Umfassender Auswirkungs-Score" : "Anbieter-Risiko-Score";

  function update(patch: Partial<FormState>) {
    setF((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  const preview = useMemo(() => {
    const materialityRatings = toRatingRecord(f.materialityRatings);
    const secondDimensionRatings = toRatingRecord(f.secondDimensionRatings);
    return isCsc
      ? previewCscClassification(materialityRatings, secondDimensionRatings, f.quickTriggers, institution.cscMaterialityThreshold, institution.cscImpactThreshold)
      : previewTeslaClassification(materialityRatings, secondDimensionRatings, f.quickTriggers, institution.teslaThreshold, institution.teslaLogicAnd);
  }, [f, isCsc, institution]);

  function save() {
    setError(null);
    if (f.overrideActive && f.overrideMaterial === null) {
      setError("Override aktiv, aber keine finale Einstufung angegeben.");
      return;
    }
    const input: RiskAnalysisInput = {
      quickTriggers: f.quickTriggers,
      materialityRatings: toRatingRecord(f.materialityRatings),
      secondDimensionRatings: toRatingRecord(f.secondDimensionRatings),
      criticality: f.criticality,
      criticalityReason: f.criticalityReason,
      overrideActive: f.overrideActive,
      overrideMaterial: f.overrideMaterial,
      overrideReason: f.overrideReason,
      overrideApprover: f.overrideApprover,
    };
    startTransition(async () => {
      try {
        await saveRiskAnalysis(activityId, input);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const sizeReliefActive = institution.sizeClass === "SEHR_KLEIN" || institution.sizeClass === "KLEIN";

  return (
    <div className="space-y-6">
      {sizeReliefActive && (
        <Banner title="Erleichterung aktiv (Tz. 2)">
          Qualitativer Ansatz statt Szenariorechnung zulässig — Institutsgröße{" "}
          {institution.sizeClass === "SEHR_KLEIN" ? "sehr klein" : "klein"}.
        </Banner>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick-Check Hard-Trigger (Tz. 4/5)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {QUICK_TRIGGERS.map((t) => (
            <label key={t.id} className="flex items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={f.quickTriggers[t.id] ?? false}
                disabled={disabled}
                onChange={(e) => update({ quickTriggers: { ...f.quickTriggers, [t.id]: e.target.checked } })}
              />
              <span>
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">({t.ref})</span>
              </span>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materialitäts-Score ({institution.calculationModel}-Modell)</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {MATERIALITY_CRITERIA.map((c) => (
            <label key={c.id} className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
              <select
                value={f.materialityRatings[c.id] ?? ""}
                disabled={disabled}
                onChange={(e) => update({ materialityRatings: { ...f.materialityRatings, [c.id]: e.target.value } })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
              >
                {RATING_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{secondDimensionLabel}</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {secondDimensionCriteria.map((c) => (
            <label key={c.id} className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
              <select
                value={f.secondDimensionRatings[c.id] ?? ""}
                disabled={disabled}
                onChange={(e) => update({ secondDimensionRatings: { ...f.secondDimensionRatings, [c.id]: e.target.value } })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
              >
                {RATING_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorschau (serverseitig maßgeblich)</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Materialität</div>
            <div className="mt-1 font-medium text-foreground">{preview.materialityScore?.toFixed(2) ?? "–"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{secondDimensionLabel}</div>
            <div className="mt-1 font-medium text-foreground">{preview.secondScore?.toFixed(2) ?? "–"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Wesentlich?</div>
            <div className="mt-1 font-medium text-foreground">
              {preview.computedMaterial === null ? "Bewertung unvollständig" : preview.computedMaterial ? "Ja" : "Nein"}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kritikalität (Tz. 4/5) &amp; Override</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Kritikalität
              <select
                value={f.criticality}
                disabled={disabled}
                onChange={(e) => update({ criticality: e.target.value as Criticality })}
                className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
              >
                {CRITICALITY_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Begründung
            <textarea
              value={f.criticalityReason}
              disabled={disabled}
              rows={2}
              onChange={(e) => update({ criticalityReason: e.target.value })}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
            />
          </label>

          <label className="flex items-center gap-2.5 border-t border-border-subtle pt-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={f.overrideActive}
              disabled={disabled}
              onChange={(e) => update({ overrideActive: e.target.checked })}
            />
            Manueller Override der finalen Einstufung
          </label>
          {f.overrideActive && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Finale Einstufung
                <select
                  value={f.overrideMaterial === null ? "" : String(f.overrideMaterial)}
                  disabled={disabled}
                  onChange={(e) => update({ overrideMaterial: e.target.value === "" ? null : e.target.value === "true" })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                >
                  <option value="">–</option>
                  <option value="true">Wesentlich</option>
                  <option value="false">Nicht wesentlich</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Genehmiger
                <input
                  value={f.overrideApprover}
                  disabled={disabled}
                  onChange={(e) => update({ overrideApprover: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                />
              </label>
              <label className="col-span-full flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Begründung des Override
                <textarea
                  value={f.overrideReason}
                  disabled={disabled}
                  rows={2}
                  onChange={(e) => update({ overrideReason: e.target.value })}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50"
                />
              </label>
            </div>
          )}
        </CardBody>
      </Card>

      {canWrite && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? "Speichert…" : "Wesentlichkeitsanalyse speichern"}
          </Button>
          {dirty && !pending && <span className="text-xs text-status-warning">Ungespeicherte Änderungen</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
