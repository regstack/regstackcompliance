"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTS } from "@/lib/regstack/revisions-universum";
import { updateUniversumBasic, setUniversumStatus, type UniversumBasicInput } from "@/app/(app)/interne-revision/pruefungsuniversum/actions";
import { createPruefung } from "@/app/(app)/interne-revision/pruefungen/actions";

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-2 text-xs text-status-danger">{error}</p>;
}

export function UniversumDetailForm({
  universumId, initial, initialStatus, lastAuditDate, personen, canWrite,
}: {
  universumId: string;
  initial: UniversumBasicInput;
  initialStatus: string;
  lastAuditDate: string | null;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [form, setForm] = useState<UniversumBasicInput>(initial);
  const [status, setStatus] = useState(initialStatus);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const disabled = !canWrite || pending;
  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm normal-case text-foreground disabled:opacity-50";
  const label = "flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateUniversumBasic(universumId, form);
        if (status !== initialStatus) await setUniversumStatus(universumId, status);
        setDirty(false);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Stammdaten des Prüfungsobjekts</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Bezeichnung
            <input value={form.bezeichnung} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, bezeichnung: e.target.value })); setDirty(true); }} className={input} />
          </label>
          <label className={label}>
            Kategorie
            <select value={form.category ?? ""} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value })); setDirty(true); }} className={input}>
              {CATEGORY_OPTS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </label>
          <label className={label}>
            Bereich
            <input value={form.bereich ?? ""} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, bereich: e.target.value })); setDirty(true); }} className={input} />
          </label>
          <label className={label}>
            Planjahr
            <input type="number" value={form.plan_year ?? ""} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, plan_year: e.target.value ? Number(e.target.value) : null })); setDirty(true); }} className={input} />
          </label>
          <label className={label}>
            Verantwortlicher für das Prüfungsobjekt
            <select value={form.verantwortlicher_person_id ?? ""} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, verantwortlicher_person_id: e.target.value || null })); setDirty(true); }} className={input}>
              <option value="">— Verantwortlicher —</option>
              {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <label className={label}>
            Status im Universum
            <select value={status} disabled={disabled}
              onChange={(e) => { setStatus(e.target.value); setDirty(true); }} className={input}>
              <option value="aktiv">aktiv</option>
              <option value="inaktiv">inaktiv (archiviert)</option>
            </select>
          </label>
          <label className={`sm:col-span-2 ${label}`}>
            Regulatorischer Anker <span className="normal-case font-normal">z. B. BTO 1.2 MaRisk; § 25a KWG</span>
            <input value={form.reg_anker ?? ""} disabled={disabled}
              onChange={(e) => { setForm((f) => ({ ...f, reg_anker: e.target.value })); setDirty(true); }} className={input} />
          </label>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <input type="checkbox" checked={form.outsourced} disabled={disabled}
            onChange={(e) => { setForm((f) => ({ ...f, outsourced: e.target.checked })); setDirty(true); }} />
          Ausgelagerte Tätigkeit — auch ausgelagerte Aktivitäten unterliegen der Revisionspflicht (Tz. 5)
        </label>

        <div className="rounded-md border border-border-subtle bg-graphite-900/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Letzte Prüfung: </span>
          {lastAuditDate ?? "noch nie geprüft"} — wird automatisch aus einer abgeschlossenen Prüfung mit Berichtsdatum
          fortgeschrieben und ist hier nicht manuell änderbar.
        </div>

        {canWrite && (
          <div className="flex items-center gap-3 pt-1">
            <Button className="px-3 py-1.5 text-xs" disabled={!dirty || pending} onClick={save}>
              {pending ? "Speichert…" : "Speichern"}
            </Button>
            {saved && !dirty && <span className="text-xs text-status-success">Gespeichert.</span>}
            <ErrorText error={error} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function CreatePruefungCard({ universumId, defaultSubject, canWrite }: { universumId: string; defaultSubject: string; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canWrite) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createPruefung({
          pruefungsobjekt_id: universumId, subject, period_from: periodFrom || null, period_to: periodTo || null,
        });
        router.push(`/interne-revision/pruefungen/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50";

  return (
    <Card>
      <CardHeader><CardTitle>Prüfung anlegen</CardTitle></CardHeader>
      <CardBody>
        {!open ? (
          <Button className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>+ Prüfung zu diesem Objekt anlegen</Button>
        ) : (
          <div className="space-y-2">
            <input placeholder="Prüfungsgegenstand" value={subject} disabled={pending} onChange={(e) => setSubject(e.target.value)} aria-label="Prüfungsgegenstand" className={`w-full ${input}`} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="date" value={periodFrom} disabled={pending} onChange={(e) => setPeriodFrom(e.target.value)} aria-label="Zeitraum von" className={input} />
              <input type="date" value={periodTo} disabled={pending} onChange={(e) => setPeriodTo(e.target.value)} aria-label="Zeitraum bis" className={input} />
            </div>
            <ErrorText error={error} />
            <div className="flex gap-2">
              <Button className="px-2.5 py-1 text-xs" disabled={pending || !subject.trim()} onClick={submit}>
                {pending ? "Legt an…" : "Prüfung anlegen"}
              </Button>
              <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => setOpen(false)}>Abbrechen</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
