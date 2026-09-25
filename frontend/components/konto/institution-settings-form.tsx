"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateInstitutionSettings, type InstitutionSettingsPatch } from "@/app/(app)/konto/institut/actions";
import type { InstitutionSettings, InstitutionSizeClass, CalculationModel } from "@/lib/regstack/institution";

const SIZE_CLASS_LABELS: Record<InstitutionSizeClass, string> = {
  SEHR_KLEIN: "Sehr klein",
  KLEIN: "Klein",
  MITTEL: "Mittel",
  GROSS: "Groß",
};
const SIZE_CLASS_VALUES = Object.keys(SIZE_CLASS_LABELS) as InstitutionSizeClass[];

const CALCULATION_MODEL_LABELS: Record<CalculationModel, string> = {
  CSC: "CSC-Modell",
  TESLA: "Tesla-FS-Modell",
};
const CALCULATION_MODEL_VALUES = Object.keys(CALCULATION_MODEL_LABELS) as CalculationModel[];

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const checkboxRowCls = "flex items-center gap-2 text-sm text-foreground";

export function InstitutionSettingsForm({
  initialSettings,
  canWrite,
}: {
  initialSettings: InstitutionSettings;
  canWrite: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof InstitutionSettings>(key: K, value: InstitutionSettings[K]) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError(null);
    setSaved(false);
    const patch: InstitutionSettingsPatch = {
      sizeClass: settings.sizeClass,
      groupRelief: settings.groupRelief,
      calculationModel: settings.calculationModel,
      cscMaterialityThreshold: settings.cscMaterialityThreshold,
      cscImpactThreshold: settings.cscImpactThreshold,
      teslaLogicAnd: settings.teslaLogicAnd,
      teslaThreshold: settings.teslaThreshold,
      revisionsbeauftragterName: settings.revisionsbeauftragterName,
      revisionsbeauftragterIstGeschaeftsleiter: settings.revisionsbeauftragterIstGeschaeftsleiter,
    };
    startTransition(async () => {
      try {
        const updated = await updateInstitutionSettings(patch);
        setSettings(updated);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const isCsc = settings.calculationModel === "CSC";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institutseinstellungen</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            Größenklasse
            {canWrite ? (
              <select
                value={settings.sizeClass}
                disabled={pending}
                onChange={(e) => set("sizeClass", e.target.value as InstitutionSizeClass)}
                className={inputCls}
              >
                {SIZE_CLASS_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {SIZE_CLASS_LABELS[v]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="normal-case text-foreground">{SIZE_CLASS_LABELS[settings.sizeClass]}</span>
            )}
          </label>

          <label className={labelCls}>
            Berechnungsmodell (Wesentlichkeitsanalyse)
            {canWrite ? (
              <select
                value={settings.calculationModel}
                disabled={pending}
                onChange={(e) => set("calculationModel", e.target.value as CalculationModel)}
                className={inputCls}
              >
                {CALCULATION_MODEL_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {CALCULATION_MODEL_LABELS[v]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="normal-case text-foreground">{CALCULATION_MODEL_LABELS[settings.calculationModel]}</span>
            )}
          </label>
        </div>

        <label className={checkboxRowCls}>
          <input
            type="checkbox"
            checked={settings.groupRelief}
            disabled={!canWrite || pending}
            onChange={(e) => set("groupRelief", e.target.checked)}
          />
          Gruppenerleichterung (§ 25b Abs. 2 KWG) nutzen
        </label>

        {isCsc ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>
              CSC-Materialitätsschwelle (1–5)
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={settings.cscMaterialityThreshold}
                disabled={!canWrite || pending}
                onChange={(e) => set("cscMaterialityThreshold", Number(e.target.value))}
                className={`${inputCls} normal-case disabled:opacity-60`}
              />
            </label>
            <label className={labelCls}>
              CSC-Auswirkungsschwelle (1–5)
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={settings.cscImpactThreshold}
                disabled={!canWrite || pending}
                onChange={(e) => set("cscImpactThreshold", Number(e.target.value))}
                className={`${inputCls} normal-case disabled:opacity-60`}
              />
            </label>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>
              Tesla-Schwellenwert (1–5)
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={settings.teslaThreshold}
                disabled={!canWrite || pending}
                onChange={(e) => set("teslaThreshold", Number(e.target.value))}
                className={`${inputCls} normal-case disabled:opacity-60`}
              />
            </label>
            <label className={`${checkboxRowCls} pt-4`}>
              <input
                type="checkbox"
                checked={settings.teslaLogicAnd}
                disabled={!canWrite || pending}
                onChange={(e) => set("teslaLogicAnd", e.target.checked)}
              />
              UND-Verknüpfung (statt ODER) von Materialitäts- und Anbieter-Risiko-Score
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            Revisionsbeauftragter (Name)
            <input
              value={settings.revisionsbeauftragterName ?? ""}
              disabled={!canWrite || pending}
              onChange={(e) => set("revisionsbeauftragterName", e.target.value || null)}
              className={`${inputCls} normal-case disabled:opacity-60`}
            />
          </label>
          <label className={`${checkboxRowCls} pt-4`}>
            <input
              type="checkbox"
              checked={settings.revisionsbeauftragterIstGeschaeftsleiter}
              disabled={!canWrite || pending}
              onChange={(e) => set("revisionsbeauftragterIstGeschaeftsleiter", e.target.checked)}
            />
            Revisionsbeauftragter ist Mitglied der Geschäftsleitung
          </label>
        </div>

        {canWrite && (
          <div className="flex items-center gap-3 border-t border-border-subtle pt-4">
            <Button onClick={save} disabled={pending}>
              {pending ? "Wird gespeichert…" : "Speichern"}
            </Button>
            {saved && <span className="text-xs text-status-success">Gespeichert.</span>}
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
