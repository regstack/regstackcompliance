"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ratingMeta, retentionUntil, OVERALL_RATING } from "@/lib/regstack/revisions-utils";
import { AUDIT_STATUS_OPTS } from "@/lib/regstack/revisions-universum";
import { updateBericht, type BerichtInput } from "@/app/(app)/interne-revision/pruefungen/actions";

export function BerichtForm({
  pruefungId, initial, personen, canWrite,
}: {
  pruefungId: string;
  initial: BerichtInput;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [form, setForm] = useState<BerichtInput>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disabled = !canWrite || pending;
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  const rm = ratingMeta(form.overall_rating);
  const abweichung = (Number(form.actual_days) || 0) - (Number(form.budget_days) || 0);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBericht(pruefungId, form);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function set<K extends keyof BerichtInput>(k: K, v: BerichtInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Berichtsangaben</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tz. 7 — zeitnaher schriftlicher Bericht mit Prüfungsgegenstand, Feststellungen und ggf. Maßnahmen; Tz. 10 —
          nachvollziehbare Arbeitsunterlagen.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>
            Status
            <select value={form.status} disabled={disabled} onChange={(e) => set("status", e.target.value)} className={input}>
              {AUDIT_STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
          <label className={label}>
            Erstellt von
            <select value={form.prepared_by ?? ""} disabled={disabled} onChange={(e) => set("prepared_by", e.target.value || null)} className={input}>
              <option value="">—</option>
              {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <label className={label}>
            Berichtsdatum
            <input type="date" value={form.report_date ?? ""} disabled={disabled} onChange={(e) => set("report_date", e.target.value || null)} className={input} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Vorgelegt an (GL-Mitglied)
            <input value={form.presented_to ?? ""} disabled={disabled} onChange={(e) => set("presented_to", e.target.value)} className={input} />
          </label>
          <label className={label}>
            Vorlagedatum
            <input type="date" value={form.presented_date ?? ""} disabled={disabled} onChange={(e) => set("presented_date", e.target.value || null)} className={input} />
          </label>
        </div>

        <div>
          <h3 className="mb-1.5 text-[13px] font-semibold text-foreground">
            Gesamturteil <span className="text-xs font-normal text-muted-foreground">Tz. 7 — institutseigene Urteilsbildung</span>
          </h3>
          <select value={form.overall_rating ?? ""} disabled={disabled} onChange={(e) => set("overall_rating", e.target.value || null)} className={input} aria-label="Gesamturteil">
            {OVERALL_RATING.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          {rm.desc && <p className="mt-1.5 text-xs text-muted-foreground">{rm.desc}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>
            Budget (Personentage)
            <input type="number" value={form.budget_days} disabled={disabled} onChange={(e) => set("budget_days", Number(e.target.value))} className={input} />
          </label>
          <label className={label}>
            Ist-Aufwand (Personentage)
            <input type="number" value={form.actual_days} disabled={disabled} onChange={(e) => set("actual_days", Number(e.target.value))} className={input} />
          </label>
          <div className={label}>
            Abweichung
            <span className="pt-1">
              {Number(form.budget_days) > 0
                ? <StatusPill status={abweichung > Number(form.budget_days) * 0.2 ? "verbesserungsbeduerftig" : "gut"} label={`${abweichung >= 0 ? "+" : ""}${abweichung} PT`} />
                : <StatusPill status="offen" label="kein Budget" />}
            </span>
          </div>
        </div>

        <label className={label}>
          Arbeitsunterlagen-Referenz <span className="normal-case font-normal">Altbestand / externe Ablage</span>
          <input value={form.workpaper_ref ?? ""} disabled={disabled} onChange={(e) => set("workpaper_ref", e.target.value)} className={input} />
        </label>

        <div className="rounded-md border border-copper-500/20 bg-copper-700/10 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Aufbewahrung (Tz. 10):</strong> Bericht und Arbeitsunterlagen sind bis{" "}
          <strong className="text-foreground">{form.report_date ? retentionUntil(form.report_date) : "– (Berichtsdatum fehlt)"}</strong>{" "}
          aufzubewahren (6 Jahre ab Berichtsdatum).
        </div>

        {canWrite && (
          <div className="flex items-center gap-3">
            <Button className="px-3 py-1.5 text-xs" disabled={!dirty || pending} onClick={save}>{pending ? "Speichert…" : "Speichern"}</Button>
            {error && <span className="text-xs text-status-danger">{error}</span>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
