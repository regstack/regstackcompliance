"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { addRmModell, updateRmModell, validiereRmModell, type RmModellInput, type RmModellValidierungInput } from "@/app/(app)/risikomanagement/actions";
import type { RmModell, RmModellErklaerbarkeit, RmModellValidierungErgebnis } from "@/lib/regstack/risikomanagement";

function emptyForm(): RmModellInput {
  return {
    bezeichnung: "",
    zweck: "",
    enthaeltKiMlKomponente: false,
    erklaerbarkeit: "",
    ueberschreibungenVorhanden: false,
    ueberschreibungenBegruendung: "",
    naechsteValidierung: "",
  };
}

function ModellForm({ initial, onSubmit, onDone, onCancel }: {
  initial?: RmModellInput;
  onSubmit: (fields: RmModellInput) => Promise<unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => initial ?? emptyForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const begruendungFehlt = form.ueberschreibungenVorhanden && !form.ueberschreibungenBegruendung.trim();

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Modellbezeichnung" value={form.bezeichnung} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <textarea placeholder="Verwendungszweck" value={form.zweck} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, zweck: e.target.value }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        <select value={form.erklaerbarkeit} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, erklaerbarkeit: e.target.value as RmModellErklaerbarkeit | "" }))}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="">Erklärbarkeit —</option>
          <option value="hoch">hoch</option><option value="mittel">mittel</option><option value="gering">gering</option>
        </select>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Nächste Validierung
          <input type="date" value={form.naechsteValidierung} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, naechsteValidierung: e.target.value }))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50" />
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={form.enthaeltKiMlKomponente} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, enthaeltKiMlKomponente: e.target.checked }))} />
          Technologiegestützte Innovation / KI-ML-Komponente
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={form.ueberschreibungenVorhanden} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, ueberschreibungenVorhanden: e.target.checked }))} />
          Überschreibungen (Overrules) vorhanden
        </label>
        {form.ueberschreibungenVorhanden && (
          <textarea placeholder="Begründung für die Überschreibungspraxis" value={form.ueberschreibungenBegruendung} disabled={pending} rows={2}
            onChange={(e) => setForm((f) => ({ ...f, ueberschreibungenBegruendung: e.target.value }))}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-2" />
        )}
      </div>
      {begruendungFehlt && <p className="mt-2 text-xs text-status-warning">Bei vorhandenen Überschreibungen ist eine Begründung erforderlich.</p>}
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.bezeichnung.trim() || begruendungFehlt} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ValidierenForm({ modellId, onDone, onCancel }: { modellId: string; onDone: () => void; onCancel: () => void }) {
  const [durchgefuehrtAm, setDurchgefuehrtAm] = useState(new Date().toISOString().slice(0, 10));
  const [ergebnis, setErgebnis] = useState<RmModellValidierungErgebnis>("bestaetigt");
  const [kommentar, setKommentar] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const fields: RmModellValidierungInput = { durchgefuehrtAm, ergebnis, kommentar };
    startTransition(async () => {
      try {
        await validiereRmModell(modellId, fields);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Validierung fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input type="date" value={durchgefuehrtAm} disabled={pending} onChange={(e) => setDurchgefuehrtAm(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50" />
        <select value={ergebnis} disabled={pending} onChange={(e) => setErgebnis(e.target.value as RmModellValidierungErgebnis)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50">
          <option value="bestaetigt">bestätigt</option>
          <option value="rekalibrierung_erforderlich">Rekalibrierung erforderlich</option>
          <option value="ausser_betrieb_genommen">außer Betrieb genommen</option>
        </select>
        <textarea placeholder="Kommentar" value={kommentar} disabled={pending} rows={2} onChange={(e) => setKommentar(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50 sm:col-span-3" />
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending} onClick={submit}>{pending ? "Speichert…" : "Speichern"}</Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function ModellPanel({ items, canWrite }: { items: RmModell[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validierendId, setValidierendId] = useState<string | null>(null);

  return (
    <Card id="modelle">
      <CardHeader>
        <CardTitle>Modellregister</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Modell</Button>}
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-xs text-muted-foreground">
          Modellrisiko-Governance — Auswahl, Validierung, Rekalibrierung, Überschreibungen,
          Erklärbarkeit, explizit inklusive technologiegestützter Innovation und künstlicher
          Intelligenz (AT 4.3.4).
        </p>
        {adding && <div className="mb-3"><ModellForm onSubmit={addRmModell} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="flex flex-col gap-3">
          {items.map((m) => {
            const letzte = m.validierungen[0] ?? null;
            return (
              <div key={m.id} className="rounded-lg border border-border-subtle p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{m.bezeichnung}</span>
                    {m.enthaeltKiMlKomponente && <StatusPill status="wesentlich" label="KI/ML" />}
                    {m.erklaerbarkeit && <StatusPill status={m.erklaerbarkeit} label={`Erklärbarkeit ${m.erklaerbarkeit}`} />}
                    <StatusPill status={m.status} label={m.status.replace("_", " ")} />
                  </div>
                  {canWrite && m.status === "aktiv" && (
                    <div className="flex gap-2">
                      {editingId !== m.id && (
                        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditingId(m.id)}>Bearbeiten</Button>
                      )}
                      {validierendId !== m.id && (
                        <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setValidierendId(m.id)}>Validieren</Button>
                      )}
                    </div>
                  )}
                </div>
                {m.zweck && <p className="text-[13px] leading-relaxed text-foreground">{m.zweck}</p>}
                <div className="mt-1.5 text-[11.5px] text-muted-foreground">
                  {m.ueberschreibungenVorhanden && (
                    <div>Überschreibungen: {m.ueberschreibungenBegruendung ?? "vorhanden"}</div>
                  )}
                  {m.naechsteValidierung && <div>Nächste Validierung: {m.naechsteValidierung.slice(0, 10)}</div>}
                  {letzte ? (
                    <div>Letzte Validierung: {letzte.durchgefuehrtAm.slice(0, 10)} — <StatusPill status={letzte.ergebnis} label={letzte.ergebnis.replace(/_/g, " ")} /></div>
                  ) : (
                    <div className="text-status-warning">noch nicht validiert</div>
                  )}
                </div>
                {editingId === m.id && (
                  <div className="mt-3">
                    <ModellForm
                      initial={{
                        bezeichnung: m.bezeichnung,
                        zweck: m.zweck ?? "",
                        enthaeltKiMlKomponente: m.enthaeltKiMlKomponente,
                        erklaerbarkeit: m.erklaerbarkeit ?? "",
                        ueberschreibungenVorhanden: m.ueberschreibungenVorhanden,
                        ueberschreibungenBegruendung: m.ueberschreibungenBegruendung ?? "",
                        naechsteValidierung: m.naechsteValidierung?.slice(0, 10) ?? "",
                      }}
                      onSubmit={(fields) => updateRmModell(m.id, fields)}
                      onDone={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}
                {validierendId === m.id && (
                  <div className="mt-3">
                    <ValidierenForm modellId={m.id} onDone={() => setValidierendId(null)} onCancel={() => setValidierendId(null)} />
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Modelle erfasst.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
