"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  proposeNormZuweisung, respondNormZuweisung, decideNormZuweisung,
  addFeststellung, setFeststellungFachbereichErledigt, setFeststellungWirksamkeitBestaetigt,
  setFeststellungGeschlossen, setFeststellungAkzeptiertesRisiko, type FeststellungInput,
} from "@/app/(app)/compliance/actions";

type Handshake = {
  id: string; status: string; target_person_id: string;
  proposed_at: string; confirmed_at: string | null;
  dispute_reason: string | null; disputed_at: string | null;
  decision_by: string | null; decision_at: string | null; decision_note: string | null;
  target: { full_name: string } | null; proposer: { full_name: string } | null;
} | null;

type Feststellung = {
  id: string; titel: string; beschreibung: string | null; status: string; schweregrad: string | null;
  frist: string | null; massnahme: string | null; quelle: string | null;
  verantwortlich_person_id: string | null; verantwortlich: { full_name: string } | null;
  fachbereich_erledigt_am: string | null; wirksamkeit_bestaetigt_am: string | null;
  akzeptiertes_risiko_ueberpruefung: string | null; geschlossen_am: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  offen: "Offen", fachbereich_erledigt: "Erledigt gemeldet — Prüfung aussteht",
  wirksamkeit_bestaetigt: "Wirksamkeit bestätigt", geschlossen: "Geschlossen",
  akzeptiertes_risiko: "Akzeptiertes Risiko",
};

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-2 text-xs text-status-danger">{error}</p>;
}

export function NormWorkflow({
  normId, handshake, feststellungen, personen, canWrite, isGL, currentPersonId,
}: {
  normId: string;
  handshake: Handshake;
  feststellungen: Feststellung[];
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
  isGL: boolean;
  currentPersonId: string;
}) {
  return (
    <div className="space-y-4">
      <HandshakeCard normId={normId} handshake={handshake} personen={personen} canWrite={canWrite} isGL={isGL} currentPersonId={currentPersonId} />
      <FeststellungenCard normId={normId} feststellungen={feststellungen} personen={personen} canWrite={canWrite} />
    </div>
  );
}

function HandshakeCard({
  normId, handshake, personen, canWrite, isGL, currentPersonId,
}: {
  normId: string; handshake: Handshake; personen: { id: string; full_name: string }[];
  canWrite: boolean; isGL: boolean; currentPersonId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState(personen[0]?.id ?? "");
  const [disputeReason, setDisputeReason] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const canRespond = !!handshake && handshake.status === "vorschlag" && handshake.target_person_id === currentPersonId;
  const canDecide = !!handshake && handshake.status === "widersprochen" && isGL;

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

  return (
    <Card>
      <CardHeader><CardTitle>Normzuweisung — zweistufige Bestätigung</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Die Zuweisung geht immer von der Compliance-Funktion aus. Der Fachbereich bestätigt oder
          bestreitet; ein Streitfall geht an die Geschäftsleitung.
        </p>
        {!handshake && canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground">
              {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <Button className="px-2.5 py-1 text-xs" disabled={pending || !target}
              onClick={() => run(() => proposeNormZuweisung(normId, target))}>
              Fachbereich vorschlagen
            </Button>
          </div>
        )}
        {handshake && (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={handshake.status} label={STATUS_LABEL[handshake.status] ?? handshake.status} />
              <span className="text-muted-foreground">
                Vorschlag an <span className="font-medium text-foreground">{handshake.target?.full_name}</span> von{" "}
                {handshake.proposer?.full_name} · {handshake.proposed_at?.slice(0, 10)}
              </span>
            </div>
            {handshake.confirmed_at && <div className="text-xs text-muted-foreground">Bestätigt am {handshake.confirmed_at.slice(0, 10)}</div>}
            {handshake.dispute_reason && (
              <div className="rounded-md border border-status-danger/30 bg-status-danger-bg px-3 py-2 text-xs text-status-danger">
                Bestreitung ({handshake.disputed_at?.slice(0, 10)}): {handshake.dispute_reason}
              </div>
            )}
            {handshake.decision_note && (
              <div className="rounded-md border border-copper-500/30 bg-copper-700/10 px-3 py-2 text-xs">
                Entscheidung der Geschäftsleitung ({handshake.decision_at?.slice(0, 10)}): {handshake.decision_note}
              </div>
            )}
            {canRespond && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => run(() => respondNormZuweisung(handshake.id, normId, "bestaetigt"))}>
                  Bestätigen
                </Button>
                <input placeholder="Begründung der Bestreitung" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground" />
                <Button variant="danger" className="px-2.5 py-1 text-xs" disabled={pending}
                  onClick={() => run(() => respondNormZuweisung(handshake.id, normId, "widersprochen", disputeReason))}>
                  Bestreiten
                </Button>
              </div>
            )}
            {canDecide && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input placeholder="Entscheidung der Geschäftsleitung" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)}
                  className="min-w-[220px] flex-1 rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground" />
                <Button className="px-2.5 py-1 text-xs" disabled={pending || !decisionNote.trim()}
                  onClick={() => run(() => decideNormZuweisung(handshake.id, normId, decisionNote))}>
                  Entscheidung erfassen (GL)
                </Button>
              </div>
            )}
          </div>
        )}
        <ErrorText error={error} />
      </CardBody>
    </Card>
  );
}

function FeststellungForm({ normId, onDone, onCancel, personen }: { normId: string; onDone: () => void; onCancel: () => void; personen: { id: string; full_name: string }[] }) {
  const [form, setForm] = useState<FeststellungInput>({ titel: "", beschreibung: "", schweregrad: "gering", frist: null, massnahme: "", quelle: "", verantwortlich_person_id: null });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addFeststellung(normId, form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Titel" value={form.titel} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))} className={`sm:col-span-2 ${input}`} />
        <textarea placeholder="Sachverhalt" value={form.beschreibung} disabled={pending} rows={2} onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))} className={`sm:col-span-2 ${input}`} />
        <select value={form.schweregrad} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, schweregrad: e.target.value }))} className={input}>
          <option value="gering">gering</option><option value="mittel">mittel</option><option value="wesentlich">wesentlich</option>
        </select>
        <input type="date" value={form.frist ?? ""} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, frist: e.target.value || null }))} className={input} />
        <input placeholder="Maßnahme" value={form.massnahme} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, massnahme: e.target.value }))} className={`sm:col-span-2 ${input}`} />
        <input placeholder="Quelle (z. B. Kontrolle, Selbstbewertung)" value={form.quelle} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, quelle: e.target.value }))} className={input} />
        <select value={form.verantwortlich_person_id ?? ""} disabled={pending} onChange={(e) => setForm((f) => ({ ...f, verantwortlich_person_id: e.target.value || null }))} className={input}>
          <option value="">— Verantwortlich —</option>
          {personen.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <ErrorText error={error} />
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.titel.trim()} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function FeststellungRow({ f, normId, canWrite }: { f: Feststellung; normId: string; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ueberpruefung, setUeberpruefung] = useState("");

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen."); }
    });
  }

  return (
    <tr className="border-b border-border-subtle last:border-0 align-top">
      <td className="px-3 py-2.5">
        <div className="font-medium text-foreground">{f.titel}</div>
        {f.beschreibung && <div className="mt-0.5 text-xs text-muted-foreground">{f.beschreibung}</div>}
        {f.quelle && <div className="mt-0.5 text-[11px] text-muted-foreground">Quelle: {f.quelle}</div>}
      </td>
      <td className="px-3 py-2.5">{f.schweregrad && <StatusPill status={f.schweregrad} />}</td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {f.massnahme}
        {f.verantwortlich && <div className="mt-0.5 text-xs">Verantwortlich: {f.verantwortlich.full_name}</div>}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{f.frist ?? "—"}</td>
      <td className="px-3 py-2.5"><StatusPill status={f.status} label={STATUS_LABEL[f.status] ?? f.status} /></td>
      <td className="px-3 py-2.5">
        {canWrite && (f.status === "offen" || f.status === "fachbereich_erledigt") && (
          <div className="flex flex-col gap-1.5">
            {f.status === "offen" && (
              <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungFachbereichErledigt(f.id, normId))}>
                Als erledigt gemeldet markieren
              </Button>
            )}
            {f.status === "fachbereich_erledigt" && (
              <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungWirksamkeitBestaetigt(f.id, normId))}>
                Wirksamkeit bestätigen
              </Button>
            )}
            <div className="flex items-center gap-1">
              <input type="date" value={ueberpruefung} onChange={(e) => setUeberpruefung(e.target.value)}
                className="w-28 rounded-md border border-border-strong bg-surface px-1.5 py-1 text-[11px] text-foreground" />
              <Button variant="ghost" className="px-2 py-1 text-[11px]" disabled={pending || !ueberpruefung}
                onClick={() => run(() => setFeststellungAkzeptiertesRisiko(f.id, normId, ueberpruefung))}>
                Risiko akzeptieren
              </Button>
            </div>
          </div>
        )}
        {canWrite && f.status === "wirksamkeit_bestaetigt" && (
          <Button className="px-2 py-1 text-[11px]" disabled={pending} onClick={() => run(() => setFeststellungGeschlossen(f.id, normId))}>
            Schließen
          </Button>
        )}
        <ErrorText error={error} />
      </td>
    </tr>
  );
}

function FeststellungenCard({ normId, feststellungen, personen, canWrite }: { normId: string; feststellungen: Feststellung[]; personen: { id: string; full_name: string }[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feststellungen zu dieser Regelung</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Feststellung</Button>}
      </CardHeader>
      <CardBody>
        {adding && <div className="mb-3"><FeststellungForm normId={normId} personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {feststellungen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Feststellungen zu dieser Regelung.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Feststellung</th>
                  <th className="px-3 py-2 font-medium">Schweregrad</th>
                  <th className="px-3 py-2 font-medium">Maßnahme</th>
                  <th className="px-3 py-2 font-medium">Frist</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>{feststellungen.map((f) => <FeststellungRow key={f.id} f={f} normId={normId} canWrite={canWrite} />)}</tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
