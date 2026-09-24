"use client";

import { useState, useTransition } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateActivityStammdaten } from "@/app/(app)/outsourcing/actions";
import type { OutsourcingActivity, SpecialFunction } from "@/lib/regstack/outsourcing";

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const checkboxRowCls = "flex items-center gap-2 text-sm text-foreground";

const SPECIAL_FUNCTION_OPTIONS: { value: SpecialFunction; label: string }[] = [
  { value: "KEINE", label: "Keine" },
  { value: "RISIKOCONTROLLING", label: "Risikocontrolling" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "INTERNE_REVISION", label: "Interne Revision" },
  { value: "KERNBANKBEREICH", label: "Kernbankbereich" },
];

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function StammdatenPanel({
  activityId,
  activity,
  groupReliefEnabled,
  canWrite,
}: {
  activityId: string;
  activity: OutsourcingActivity;
  groupReliefEnabled: boolean;
  canWrite: boolean;
}) {
  const [bafinReferenceNumber, setBafinReferenceNumber] = useState(activity.bafinReferenceNumber ?? "");
  const [contractStart, setContractStart] = useState(toDateInput(activity.contractStart));
  const [contractEnd, setContractEnd] = useState(toDateInput(activity.contractEnd));
  const [terminationNoticeMonths, setTerminationNoticeMonths] = useState(
    activity.terminationNoticeMonths?.toString() ?? ""
  );
  const [serviceLocations, setServiceLocations] = useState(activity.serviceLocations ?? "");
  const [dataCategories, setDataCategories] = useState(activity.dataCategories ?? "");
  const [isCloud, setIsCloud] = useState(activity.isCloud);
  const [isSubOutsourcing, setIsSubOutsourcing] = useState(activity.isSubOutsourcing);
  const [groupInternal, setGroupInternal] = useState(activity.groupInternal);
  const [specialFunction, setSpecialFunction] = useState<SpecialFunction>(activity.specialFunction);
  const [deepDive, setDeepDive] = useState(activity.deepDive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateActivityStammdaten(activityId, {
          bafinReferenceNumber: bafinReferenceNumber || undefined,
          contractStart: contractStart ? new Date(contractStart).toISOString() : undefined,
          contractEnd: contractEnd ? new Date(contractEnd).toISOString() : undefined,
          terminationNoticeMonths: terminationNoticeMonths ? Number(terminationNoticeMonths) : undefined,
          serviceLocations: serviceLocations || undefined,
          dataCategories: dataCategories || undefined,
          isCloud,
          isSubOutsourcing,
          groupInternal,
          specialFunction,
          deepDive,
        });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Diese Angaben steuern u. a. die Weiterverlagerungs-Checkliste (Tz. 8, nur bei aktivierter
          „Weiterverlagerung“), die Konzernerleichterung bei der Aktivierungsprüfung (Tz. 14 d) und
          den Hard-Trigger für besondere Funktionen (Tz. 4/5).
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            BaFin-Referenznummer
            <input
              className={inputCls}
              value={bafinReferenceNumber}
              disabled={!canWrite}
              onChange={(e) => setBafinReferenceNumber(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Besondere Funktion (Tz. 4/5 Hard-Trigger)
            <select
              className={inputCls}
              value={specialFunction}
              disabled={!canWrite}
              onChange={(e) => setSpecialFunction(e.target.value as SpecialFunction)}
            >
              {SPECIAL_FUNCTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Vertragsbeginn
            <input
              type="date"
              className={inputCls}
              value={contractStart}
              disabled={!canWrite}
              onChange={(e) => setContractStart(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Vertragsende
            <input
              type="date"
              className={inputCls}
              value={contractEnd}
              disabled={!canWrite}
              onChange={(e) => setContractEnd(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Kündigungsfrist (Monate)
            <input
              type="number"
              className={inputCls}
              value={terminationNoticeMonths}
              disabled={!canWrite}
              onChange={(e) => setTerminationNoticeMonths(e.target.value)}
            />
          </label>
          <label className={labelCls}>
            Erbringungsorte
            <input
              className={inputCls}
              value={serviceLocations}
              disabled={!canWrite}
              onChange={(e) => setServiceLocations(e.target.value)}
            />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>
            Datenkategorien
            <input
              className={inputCls}
              value={dataCategories}
              disabled={!canWrite}
              onChange={(e) => setDataCategories(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
          <label className={checkboxRowCls}>
            <input type="checkbox" checked={isCloud} disabled={!canWrite} onChange={(e) => setIsCloud(e.target.checked)} />
            Cloud-Auslagerung (BAIT-Cloud-Vorgaben)
          </label>
          <label className={checkboxRowCls}>
            <input
              type="checkbox"
              checked={isSubOutsourcing}
              disabled={!canWrite}
              onChange={(e) => setIsSubOutsourcing(e.target.checked)}
            />
            Weiterverlagerung — schaltet die Tz. 8-Checkliste in der Vertragscheckliste frei
          </label>
          <label className={checkboxRowCls}>
            <input
              type="checkbox"
              checked={groupInternal}
              disabled={!canWrite}
              onChange={(e) => setGroupInternal(e.target.checked)}
            />
            Konzerninterne Auslagerung
            {!groupReliefEnabled && (
              <span className="text-xs text-muted-foreground">
                (Konzernerleichterung institutsweit nicht aktiviert — ohne Wirkung, siehe Konto-/Institutseinstellungen)
              </span>
            )}
          </label>
          <label className={checkboxRowCls}>
            <input type="checkbox" checked={deepDive} disabled={!canWrite} onChange={(e) => setDeepDive(e.target.checked)} />
            Vertiefte Prüfung (volle EBA/GL-Kriterien im Tesla-Modell)
          </label>
        </div>

        {canWrite && (
          <div className="flex items-center gap-3">
            <Button variant="primary" disabled={pending} onClick={save}>
              Speichern
            </Button>
            {saved && !pending && <span className="text-xs text-status-success">Gespeichert.</span>}
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
