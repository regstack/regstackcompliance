"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEVERITY_ORDER, SEVERITY_DEFAULT, type Schweregrad } from "@/lib/regstack/revisions-utils";
import { updateEinstellungen, type EinstellungenInput } from "@/app/(app)/interne-revision/einstellungen/actions";

export function EinstellungenForm({ initial, canWrite }: { initial: EinstellungenInput; canWrite: boolean }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setSeverity(key: Schweregrad, patch: { label?: string; desc?: string }) {
    setForm((f) => ({ ...f, severity_settings: { ...f.severity_settings, [key]: { ...f.severity_settings[key], ...patch } } }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateEinstellungen(form);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const input = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-60";
  const disabled = !canWrite || pending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Abstufung der Mängel</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tz. 7 — die konkrete Abgrenzung der Kategorien obliegt dem jeweiligen Institut; für Mängel mit
            geringer Risikorelevanz können eigene Kriterien definiert werden.
          </p>
          {SEVERITY_ORDER.map((k) => {
            const current = form.severity_settings[k];
            const label = current?.label ?? SEVERITY_DEFAULT[k].label;
            const desc = current?.desc ?? SEVERITY_DEFAULT[k].desc;
            return (
              <div key={k} className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {SEVERITY_DEFAULT[k].label} — Bezeichnung
                  <input className={input} value={label} disabled={disabled} onChange={(e) => setSeverity(k, { label: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Institutseigene Abgrenzung/Beschreibung
                  <textarea rows={2} className={input} value={desc} disabled={disabled} onChange={(e) => setSeverity(k, { desc: e.target.value })} />
                </label>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fristen und Intervalle</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              „Angemessene Zeit&rdquo; bis zur Eskalation (Tz. 12 S.1)
              <input type="number" className={input} value={form.angemessene_zeit_tage} disabled={disabled}
                onChange={(e) => { setForm((f) => ({ ...f, angemessene_zeit_tage: Number(e.target.value) || 0 })); setSaved(false); }} />
              <span className="text-[11px] font-normal normal-case text-muted-foreground">Tage nach Fälligkeit der Maßnahme. Gesetzlich nicht beziffert — Standardwert 90 Tage.</span>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Intervall Qualitätsüberprüfung (Tz. 1 S.2)
              <input type="number" className={input} value={form.qs_intervall_monate} disabled={disabled}
                onChange={(e) => { setForm((f) => ({ ...f, qs_intervall_monate: Number(e.target.value) || 0 })); setSaved(false); }} />
              <span className="text-[11px] font-normal normal-case text-muted-foreground">Monate zwischen regelmäßigen Überprüfungen von Planung, Methoden und Qualität. „Regelmäßig&rdquo; ist nicht beziffert — Standardwert 12 Monate.</span>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Intervall Risikobewertung (Tz. 6 S.3)
              <input type="number" className={input} value={form.risiko_review_intervall_monate} disabled={disabled}
                onChange={(e) => { setForm((f) => ({ ...f, risiko_review_intervall_monate: Number(e.target.value) || 0 })); setSaved(false); }} />
              <span className="text-[11px] font-normal normal-case text-muted-foreground">Monate bis zur erneuten Überprüfung der Risikobewertung je Prüfungsobjekt.</span>
            </label>
          </div>
          <p className="rounded-md border border-copper-500/30 bg-copper-700/10 px-3 py-2 text-xs text-copper-100">
            Die gesetzlichen Obergrenzen des Prüfungsturnus (drei Jahre; fünf Jahre für nicht wesentliche
            Aktivitäten, Tz. 6 S.5-7) sind bewusst <b>nicht</b> einstellbar — sie sind eine Grenze, keine
            Voreinstellung.
          </p>
        </CardBody>
      </Card>

      {canWrite && (
        <div className="flex items-center gap-2">
          <Button disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
          {saved && <span className="text-xs text-status-success">Gespeichert.</span>}
          {error && <span className="text-xs text-status-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
