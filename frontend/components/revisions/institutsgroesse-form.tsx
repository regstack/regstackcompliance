"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { SIZE_CLASS_LABEL, type InstitutionSettings, type SizeClass } from "@/lib/regstack/institution";
import { updateSizeClass, updateReviewCycleYears, updateRevisionsbeauftragter } from "@/app/(app)/interne-revision/institutsgroesse/actions";

const inputCls = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50";
const labelCls = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

const SIZE_CLASSES: SizeClass[] = ["SEHR_KLEIN", "KLEIN", "MITTEL", "GROSS"];
const DERIVED_REVIEW_CYCLE: Record<SizeClass, number> = { SEHR_KLEIN: 3, KLEIN: 3, MITTEL: 2, GROSS: 1 };

export function InstitutsgroesseForm({ initial, canWrite }: { initial: InstitutionSettings; canWrite: boolean }) {
  const [sizeClass, setSizeClass] = useState<SizeClass>(initial.sizeClass);
  const [reviewCycleYears, setReviewCycleYears] = useState(String(initial.reviewCycleYears));
  const [revName, setRevName] = useState(initial.revisionsbeauftragterName ?? "");
  const [revIstGl, setRevIstGl] = useState(initial.revisionsbeauftragterIstGeschaeftsleiter);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Same rule the backend enforces (Tz. 10): only offer the checkbox at all when the size actually
  // in effect on save is SEHR_KLEIN — using the *pending* sizeClass selection, not the initial one,
  // so the checkbox disables the moment the user picks a bigger size class, before they even save.
  const revToggleAllowed = sizeClass === "SEHR_KLEIN";

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Institutsgröße</CardTitle>
          <StatusPill status="open" label={SIZE_CLASS_LABEL[initial.sizeClass]} />
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Die Interne Revision stuft die Größenklasse institutsseitig ein (§ 1 Abs. 3d KWG, MaRisk-Öffnungsklauseln
            für kleine Institute). Die Einstufung treibt mehrere Erleichterungen, die weiter unten erläutert sind.
          </p>
          {canWrite ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className={labelCls}>
                Größenklasse
                <select
                  className={inputCls}
                  value={sizeClass}
                  disabled={pending}
                  onChange={(e) => {
                    const next = e.target.value as SizeClass;
                    setSizeClass(next);
                    // Mirrors the server's own default derivation so the displayed Prüfungsturnus
                    // doesn't look stale between picking a new size and saving it.
                    setReviewCycleYears(String(DERIVED_REVIEW_CYCLE[next]));
                    if (next !== "SEHR_KLEIN") setRevIstGl(false);
                  }}
                >
                  {SIZE_CLASSES.map((s) => (
                    <option key={s} value={s}>
                      {SIZE_CLASS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={pending || sizeClass === initial.sizeClass} onClick={() => run(() => updateSizeClass(sizeClass))}>
                Speichern
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nur Interne Revision, Geschäftsleitung oder Admin können die Größenklasse ändern.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Erleichterungen nach Institutsgröße</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4 text-sm text-foreground">
          <div>
            <p className="font-medium">Berichtsformat — Tz. 13 S. 4</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Bei „Sehr klein“ wird der Bericht über die Auslagerungen automatisch als
              Vorstandssitzungsprotokoll statt als eigenständiger Bericht geführt (siehe Modul
              Outsourcing → Bericht über die Auslagerungen). Serverseitig bereits umgesetzt, keine
              weitere Einstellung hier erforderlich.
            </p>
          </div>
          <div className="border-t border-border-subtle pt-3">
            <p className="font-medium">Prüfungsturnus</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Aus der Größenklasse abgeleitet — Sehr klein/Klein: 3 Jahre, Mittel: 2 Jahre, Groß: 1 Jahr —
              aber institutsseitig überschreibbar, z. B. bei erhöhtem Risiko.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className={labelCls}>
                Turnus (Jahre)
                <input
                  type="number"
                  min={1}
                  max={3}
                  className={inputCls}
                  value={reviewCycleYears}
                  disabled={pending || !canWrite}
                  onChange={(e) => setReviewCycleYears(e.target.value)}
                />
              </label>
              {canWrite && (
                <Button
                  variant="secondary"
                  disabled={pending || Number(reviewCycleYears) === initial.reviewCycleYears}
                  onClick={() => run(() => updateReviewCycleYears(Number(reviewCycleYears)))}
                >
                  Turnus überschreiben
                </Button>
              )}
            </div>
          </div>
          <div className="border-t border-border-subtle pt-3">
            <p className="font-medium">Revisionsbeauftragter = Geschäftsleiter — Tz. 10</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Nur bei sehr kleinen Instituten zulässig, dass die Aufgaben der Internen Revision durch
              ein Mitglied der Geschäftsleitung wahrgenommen werden.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Name des Revisionsbeauftragten
                <input
                  className={inputCls}
                  value={revName}
                  disabled={pending || !canWrite}
                  onChange={(e) => setRevName(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2.5 self-end text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={revIstGl}
                  disabled={pending || !canWrite || !revToggleAllowed}
                  onChange={(e) => setRevIstGl(e.target.checked)}
                />
                Ist Mitglied der Geschäftsleitung
              </label>
            </div>
            {!revToggleAllowed && (
              <p className="mt-1.5 text-[11px] text-status-warning">
                Nur bei Größenklasse „Sehr klein“ zulässig (Tz. 10) — aktuell gewählt: {SIZE_CLASS_LABEL[sizeClass]}.
              </p>
            )}
            {canWrite && (
              <Button
                className="mt-2 px-2.5 py-1 text-xs"
                variant="secondary"
                disabled={
                  pending ||
                  (revName === (initial.revisionsbeauftragterName ?? "") &&
                    revIstGl === initial.revisionsbeauftragterIstGeschaeftsleiter)
                }
                onClick={() =>
                  run(() =>
                    updateRevisionsbeauftragter({
                      revisionsbeauftragterName: revName || null,
                      revisionsbeauftragterIstGeschaeftsleiter: revIstGl,
                    })
                  )
                }
              >
                Speichern
              </Button>
            )}
          </div>
          <div className="border-t border-border-subtle pt-3">
            <p className="font-medium">Qualitativer Ansatz statt Szenariorechnung — Tz. 2</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Bei „Sehr klein“ und „Klein“ darf statt einer Szenariorechnung ein qualitativer Ansatz
              gewählt werden — als Hinweis auf jeder Auslagerung mit Wesentlichkeitseinstufung
              sichtbar (Reiter „Wesentlichkeit“).
            </p>
          </div>
        </CardBody>
      </Card>

      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}
