"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  createExternePruefung, acknowledgeExternePruefung, distributeExternePruefungFeststellung,
  setFeststellungFachbereichErledigt, setFeststellungWirksamkeitBestaetigt,
  setFeststellungGeschlossen, setFeststellungAkzeptiertesRisiko,
  type ExternePruefungInput, type ExternePruefungFeststellungInput,
} from "@/app/(app)/interne-revision/externe-pruefungen/actions";

export type FeststellungRow = {
  id: string;
  titel: string;
  beschreibung: string | null;
  schweregrad: string | null;
  frist: string | null;
  modul: string | null;
  fachbereich: string | null;
  verantwortlich_person_id: string | null;
  status: string;
  verantwortlich: { full_name: string } | null;
};

export type ExternePruefungRow = {
  id: string;
  pruefer: string;
  jahr: number;
  berichtsdatum: string | null;
  gl_kenntnisnahme_am: string | null;
  feststellungen: FeststellungRow[];
};

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  fachbereich_erledigt: "Erledigt gemeldet — Prüfung aussteht",
  wirksamkeit_bestaetigt: "Wirksamkeit bestätigt",
  geschlossen: "Geschlossen",
  akzeptiertes_risiko: "Akzeptiertes Risiko",
};

const MODUL_LABEL: Record<string, string> = { OUTSOURCING: "Outsourcing", COMPLIANCE: "Compliance", INTERNAL_AUDIT: "Interne Revision" };

const inputCls = "w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

function isOverdue(frist: string | null) {
  return !!frist && frist < new Date().toISOString().slice(0, 10);
}

function AddPruefungForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState<ExternePruefungInput>({ pruefer: "", jahr: new Date().getFullYear(), berichtsdatum: null });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createExternePruefung(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_120px_160px]">
        <input placeholder="Prüfungsgesellschaft / Wirtschaftsprüfer" className={inputCls} disabled={pending} value={form.pruefer}
          onChange={(e) => setForm((f) => ({ ...f, pruefer: e.target.value }))} />
        <input type="number" placeholder="Jahr" className={inputCls} disabled={pending} value={form.jahr}
          onChange={(e) => setForm((f) => ({ ...f, jahr: Number(e.target.value) }))} />
        <input type="date" className={inputCls} disabled={pending} value={form.berichtsdatum ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, berichtsdatum: e.target.value || null }))} />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.pruefer.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function AddFeststellungForm({
  externePruefungId, personen, onDone,
}: {
  externePruefungId: string;
  personen: { id: string; full_name: string }[];
  onDone: () => void;
}) {
  const [form, setForm] = useState<ExternePruefungFeststellungInput>({
    titel: "", beschreibung: "", schweregrad: "", frist: null, modul: null, fachbereich: "", verantwortlich_person_id: null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await distributeExternePruefungFeststellung(externePruefungId, form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <input placeholder="Feststellung des externen Prüfers" className={inputCls} disabled={pending} value={form.titel}
        onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))} />
      <textarea placeholder="Beschreibung" className={`mt-2 ${inputCls}`} rows={2} disabled={pending} value={form.beschreibung}
        onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select className={inputCls} disabled={pending} value={form.schweregrad}
          onChange={(e) => setForm((f) => ({ ...f, schweregrad: e.target.value }))}>
          <option value="">Schweregrad</option>
          <option value="gering">Gering</option>
          <option value="mittel">Mittel</option>
          <option value="wesentlich">Wesentlich</option>
        </select>
        <select className={inputCls} disabled={pending} value={form.modul ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, modul: e.target.value || null }))}>
          <option value="">Modul (optional)</option>
          <option value="OUTSOURCING">Outsourcing</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="INTERNAL_AUDIT">Interne Revision</option>
        </select>
        <input placeholder="Fachbereich (Freitext)" className={inputCls} disabled={pending} value={form.fachbereich}
          onChange={(e) => setForm((f) => ({ ...f, fachbereich: e.target.value }))} />
        <input type="date" className={inputCls} disabled={pending} value={form.frist ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, frist: e.target.value || null }))} />
      </div>
      <select className={`mt-2 ${inputCls}`} disabled={pending} value={form.verantwortlich_person_id ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, verantwortlich_person_id: e.target.value || null }))}>
        <option value="">Verantwortliche/r zuweisen — verteilt die Feststellung sofort</option>
        {personen.map((p) => (
          <option key={p.id} value={p.id}>{p.full_name}</option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.titel.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern & verteilen"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onDone}>Abbrechen</Button>
      </div>
    </div>
  );
}

function FeststellungActions({ f, canWrite, isOwner }: { f: FeststellungRow; canWrite: boolean; isOwner: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ueberpruefung, setUeberpruefung] = useState("");

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

  if (!canWrite && !isOwner) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {f.status === "offen" && (canWrite || isOwner) && (
        <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungFachbereichErledigt(f.id))}>
          Als erledigt melden
        </Button>
      )}
      {f.status === "fachbereich_erledigt" && canWrite && (
        <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungWirksamkeitBestaetigt(f.id))}>
          Wirksamkeit bestätigen
        </Button>
      )}
      {f.status === "wirksamkeit_bestaetigt" && canWrite && (
        <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungGeschlossen(f.id))}>
          Schließen
        </Button>
      )}
      {(f.status === "offen" || f.status === "fachbereich_erledigt") && canWrite && (
        <div className="flex items-center gap-1">
          <input type="date" className="rounded border border-border-strong bg-surface px-1.5 py-1 text-[11px]" value={ueberpruefung}
            onChange={(e) => setUeberpruefung(e.target.value)} disabled={pending} />
          <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending || !ueberpruefung}
            onClick={() => run(() => setFeststellungAkzeptiertesRisiko(f.id, ueberpruefung))}>
            Risiko akzeptieren
          </Button>
        </div>
      )}
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
    </div>
  );
}

export function ExternePruefungenPanel({
  pruefungen, personen, canWrite, canAcknowledge, currentUserId, onlyMineDefault = false,
}: {
  pruefungen: ExternePruefungRow[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
  canAcknowledge: boolean;
  currentUserId: string;
  onlyMineDefault?: boolean;
}) {
  const [addingPruefung, setAddingPruefung] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(onlyMineDefault);
  const [ackPending, startAck] = useTransition();

  const visiblePruefungen = useMemo(() => {
    if (!onlyMine) return pruefungen;
    return pruefungen
      .map((p) => ({ ...p, feststellungen: p.feststellungen.filter((f) => f.verantwortlich_person_id === currentUserId) }))
      .filter((p) => p.feststellungen.length > 0);
  }, [pruefungen, onlyMine, currentUserId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Nur mir zugewiesene Feststellungen
        </label>
        {canWrite && !addingPruefung && (
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingPruefung(true)}>+ Externe Prüfung erfassen</Button>
        )}
      </div>

      {addingPruefung && <AddPruefungForm onDone={() => setAddingPruefung(false)} />}

      {visiblePruefungen.length === 0 && (
        <Card className="px-5 py-6">
          <p className="text-sm text-muted-foreground">
            {onlyMine ? "Ihnen sind derzeit keine Feststellungen aus einer externen Prüfung zugewiesen." : "Noch keine externe Prüfung erfasst."}
          </p>
        </Card>
      )}

      {visiblePruefungen.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>
              {p.pruefer} — {p.jahr}
              {p.berichtsdatum && <span className="ml-2 font-normal text-muted-foreground">(Bericht vom {p.berichtsdatum})</span>}
            </CardTitle>
            {p.gl_kenntnisnahme_am ? (
              <span className="text-xs text-status-success">Kenntnisnahme GL am {p.gl_kenntnisnahme_am}</span>
            ) : canAcknowledge ? (
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                disabled={ackPending}
                onClick={() => startAck(() => acknowledgeExternePruefung(p.id))}
              >
                Kenntnisnahme durch Geschäftsleitung
              </Button>
            ) : (
              <span className="text-xs text-status-warning">Kenntnisnahme durch GL aussteht</span>
            )}
          </CardHeader>
          <CardBody className="space-y-2">
            {canWrite && addingTo !== p.id && (
              <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAddingTo(p.id)}>+ Feststellung verteilen</Button>
            )}
            {addingTo === p.id && (
              <AddFeststellungForm externePruefungId={p.id} personen={personen} onDone={() => setAddingTo(null)} />
            )}

            {p.feststellungen.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Feststellung verteilt.</p>}

            {p.feststellungen.length > 0 && (
              <table className="w-full text-sm">
                <tbody>
                  {p.feststellungen.map((f) => {
                    const overdue = f.status !== "geschlossen" && f.status !== "akzeptiertes_risiko" && isOverdue(f.frist);
                    const isOwner = f.verantwortlich_person_id === currentUserId;
                    return (
                      <tr key={f.id} className="border-b border-border-subtle align-top last:border-0">
                        <td className="px-2 py-2.5">
                          <div className="font-medium text-foreground">{f.titel}</div>
                          {f.beschreibung && <div className="mt-0.5 text-xs text-muted-foreground">{f.beschreibung}</div>}
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {f.modul && MODUL_LABEL[f.modul]}
                            {f.modul && f.fachbereich && " · "}
                            {f.fachbereich}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">{f.schweregrad && <StatusPill status={f.schweregrad} />}</td>
                        <td className="px-2 py-2.5 text-muted-foreground">{f.verantwortlich?.full_name ?? "—"}</td>
                        <td className="px-2 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">{f.frist ?? "—"}</span>
                          {overdue && <div className="mt-1"><StatusPill status="beendet" label="überfällig" /></div>}
                        </td>
                        <td className="px-2 py-2.5"><StatusPill status={f.status} label={STATUS_LABEL[f.status] ?? f.status} /></td>
                        <td className="px-2 py-2.5">
                          <FeststellungActions f={f} canWrite={canWrite} isOwner={isOwner} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
