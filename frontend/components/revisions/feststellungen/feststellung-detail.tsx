"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  execEscalationRequired, execEscalationOpen,
  type Escalation, type ExecEscalation,
} from "@/lib/regstack/revisions-utils";
import {
  setFeststellungMassnahmeErledigt, setFeststellungGeschlossen, updateAbschlussEntwurf,
  updateStellungnahme, setExecutiveTarget, updateExecEscalation, updateEscalation, updateNachschau,
  addFristverlaengerung, type AbschlussFields, type StellungnahmeFields,
} from "@/app/(app)/interne-revision/feststellungen/actions";

type Verlaengerung = {
  id: string; alt: string | null; neu: string; antragsteller: string | null;
  genehmiger: string | null; begruendung: string | null; datum: string;
  genehmiger_person: { full_name: string } | null;
};

export type FeststellungDetailData = {
  id: string;
  status: string;
  abschluss_art: string | null;
  schweregrad: string | null;
  frist_urspruenglich: string | null;
  executive_target: boolean;
  exec_escalation: unknown;
  escalation: unknown;
  nachschau_needed: boolean;
  nachschau_date: string | null;
  stellungnahme: unknown;
  abschluss: unknown;
  verlaengerungen: Verlaengerung[];
  effectiveDue: string | null;
};

const input = "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-foreground disabled:opacity-50";
const box = "rounded-md border border-border-subtle bg-graphite-950 p-3";

function useAction<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(...args: T) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await fn(...args);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
        }
        resolve();
      });
    });
  }
  return { run, pending, error };
}

export function FeststellungDetail({
  f, canWrite, isFachbereich,
}: {
  f: FeststellungDetailData;
  canWrite: boolean;
  isFachbereich: boolean;
}) {
  const closed = f.status === "geschlossen";
  const stellungnahme = (f.stellungnahme ?? {}) as StellungnahmeFields;
  const abschluss = (f.abschluss ?? {}) as AbschlussFields;
  const escalation = (f.escalation ?? {}) as Escalation;
  const execEscalation = (f.exec_escalation ?? {}) as ExecEscalation;

  const [stellungnahmeForm, setStellungnahmeForm] = useState<StellungnahmeFields>(stellungnahme);
  const [abschlussForm, setAbschlussForm] = useState<AbschlussFields>(abschluss);
  const [escalationForm, setEscalationForm] = useState<Escalation>(escalation);
  const [execForm, setExecForm] = useState<ExecEscalation>(execEscalation);
  const [nachschauNeeded, setNachschauNeeded] = useState(f.nachschau_needed);
  const [nachschauDate, setNachschauDate] = useState(f.nachschau_date ?? "");
  const [abschlussArt, setAbschlussArt] = useState<"erledigt" | "restrisiko">(
    (f.abschluss_art as "erledigt" | "restrisiko") || "erledigt"
  );

  const [neu, setNeu] = useState("");
  const [antragsteller, setAntragsteller] = useState("");
  const [genehmiger, setGenehmiger] = useState("");
  const [begruendung, setBegruendung] = useState("");
  const [showFristForm, setShowFristForm] = useState(false);

  const massnahmeErledigt = useAction(() => setFeststellungMassnahmeErledigt(f.id));
  const schliessen = useAction(() => setFeststellungGeschlossen(f.id, abschlussArt, abschlussForm));
  const saveAbschluss = useAction(() => updateAbschlussEntwurf(f.id, abschlussForm));
  const saveStellungnahme = useAction(() => updateStellungnahme(f.id, stellungnahmeForm));
  const toggleExecutiveTarget = useAction((v: boolean) => setExecutiveTarget(f.id, v));
  const saveExec = useAction(() => updateExecEscalation(f.id, execForm));
  const saveEscalation = useAction(() => updateEscalation(f.id, escalationForm));
  const saveNachschau = useAction(() => updateNachschau(f.id, nachschauNeeded, nachschauDate || null));
  const addFrist = useAction(() =>
    addFristverlaengerung(f.id, f.effectiveDue, { neu, antragsteller, genehmiger: genehmiger || null, begruendung })
  );

  const execReq = execEscalationRequired(f.executive_target, f.schweregrad);
  const execOpen = execEscalationOpen(f.executive_target, f.schweregrad, execEscalation);
  const showTz12 = f.schweregrad !== "geringfuegig";
  const canEditJson = canWrite && !closed;
  const verschiebung =
    f.frist_urspruenglich && f.effectiveDue && f.frist_urspruenglich !== f.effectiveDue
      ? Math.round((new Date(f.effectiveDue).getTime() - new Date(f.frist_urspruenglich).getTime()) / 86400000)
      : null;

  return (
    <div className="space-y-3 border-t border-border-subtle bg-graphite-900/40 p-4">
      {closed && (
        <div className="rounded-md border border-status-success/30 bg-status-success-bg px-3 py-2 text-xs text-status-success">
          Geschlossen{f.abschluss_art ? ` (${f.abschluss_art === "restrisiko" ? "mit Restrisiko" : "erledigt"})` : ""} — die
          gesamte Zeile ist ab jetzt unveränderlich, es können keine Felder mehr angepasst werden.
        </div>
      )}

      {/* Fristenhistorie */}
      <div className={box}>
        <div className="mb-1 flex items-center justify-between">
          <strong className="text-xs text-foreground">Fristenhistorie</strong>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {(f.verlaengerungen ?? []).length}× verlängert{verschiebung !== null ? ` · ${verschiebung} Tage verschoben` : ""}
            </span>
          </div>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Die ursprünglich zugesagte Frist bleibt dauerhaft sichtbar und wird nie überschrieben —
          jede Verlängerung ist ein eigener Datensatz mit Antragsteller, Genehmiger und Begründung.
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ursprüngliche Frist</div>
            <div className="font-mono text-xs text-foreground">{f.frist_urspruenglich ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Aktuell wirksame Frist</div>
            <div className="font-mono text-xs text-foreground">{f.effectiveDue ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Überfällig</div>
            <div className="text-xs">
              {f.effectiveDue && f.effectiveDue < new Date().toISOString().slice(0, 10) && f.status !== "geschlossen" ? (
                <StatusPill status="beendet" label="überfällig" />
              ) : (
                "nein"
              )}
            </div>
          </div>
        </div>

        {(f.verlaengerungen ?? []).length > 0 && (
          <div className="mb-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Datum</th>
                  <th className="py-1 pr-2 font-medium">von → auf</th>
                  <th className="py-1 pr-2 font-medium">Antragsteller</th>
                  <th className="py-1 pr-2 font-medium">Genehmiger</th>
                  <th className="py-1 font-medium">Begründung</th>
                </tr>
              </thead>
              <tbody>
                {f.verlaengerungen.map((v) => (
                  <tr key={v.id} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-1 pr-2 font-mono">{v.datum}</td>
                    <td className="py-1 pr-2 font-mono">{v.alt ?? "—"} → {v.neu}</td>
                    <td className="py-1 pr-2">{v.antragsteller ?? "—"}</td>
                    <td className="py-1 pr-2">{v.genehmiger_person?.full_name ?? "—"}</td>
                    <td className="py-1">{v.begruendung ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEditJson && !showFristForm && (
          <Button variant="secondary" className="px-2 py-1 text-[11px]" onClick={() => setShowFristForm(true)}>
            + Fristverlängerung erfassen
          </Button>
        )}
        {canEditJson && showFristForm && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="date" value={neu} onChange={(e) => setNeu(e.target.value)} className={input} placeholder="Neue Frist" aria-label="Neue Frist" />
            <input value={antragsteller} onChange={(e) => setAntragsteller(e.target.value)} className={input} placeholder="Antragsteller" aria-label="Antragsteller" />
            <input value={genehmiger} onChange={(e) => setGenehmiger(e.target.value)} className={input} placeholder="Genehmiger (Personen-ID)" aria-label="Genehmiger (Personen-ID)" />
            <input value={begruendung} onChange={(e) => setBegruendung(e.target.value)} className={input} placeholder="Begründung" aria-label="Begründung" />
            <div className="flex gap-2 sm:col-span-2">
              <Button
                className="px-2 py-1 text-[11px]"
                disabled={addFrist.pending || !neu}
                onClick={() => addFrist.run().then(() => setShowFristForm(false))}
              >
                Speichern
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => setShowFristForm(false)}>Abbrechen</Button>
            </div>
            {addFrist.error && <p className="text-[11px] text-status-danger sm:col-span-2">{addFrist.error}</p>}
          </div>
        )}
      </div>

      {/* Stellungnahme */}
      <div className={box}>
        <strong className="text-xs text-foreground">Stellungnahme des geprüften Bereichs</strong>
        <p className="mb-2 mt-1 text-[11px] text-muted-foreground">
          Die Stellungnahme wandert unverändert in den finalen Bericht — auch ein Widerspruch. Das
          System bewertet sie nicht, es bewahrt sie.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Verfasser" value={stellungnahmeForm.verfasser ?? ""} disabled={!canEditJson}
            onChange={(e) => setStellungnahmeForm((s) => ({ ...s, verfasser: e.target.value }))} className={input}
            aria-label="Verfasser"
          />
          <input
            type="date" value={stellungnahmeForm.datum ?? ""} disabled={!canEditJson}
            onChange={(e) => setStellungnahmeForm((s) => ({ ...s, datum: e.target.value }))} className={input}
            aria-label="Datum der Stellungnahme"
          />
          <select
            value={stellungnahmeForm.status ?? ""} disabled={!canEditJson}
            onChange={(e) => setStellungnahmeForm((s) => ({ ...s, status: e.target.value }))} className={input}
            aria-label="Status der Stellungnahme"
          >
            <option value="">— keine Stellungnahme</option>
            <option value="zugestimmt">zugestimmt</option>
            <option value="teilweise">teilweise zugestimmt</option>
            <option value="widersprochen">widersprochen</option>
          </select>
          <textarea
            placeholder="Stellungnahme" rows={2} value={stellungnahmeForm.text ?? ""} disabled={!canEditJson}
            onChange={(e) => setStellungnahmeForm((s) => ({ ...s, text: e.target.value }))} className={`sm:col-span-3 ${input}`}
            aria-label="Stellungnahme"
          />
        </div>
        {canEditJson && (
          <div className="mt-2 flex items-center gap-2">
            <Button className="px-2 py-1 text-[11px]" disabled={saveStellungnahme.pending} onClick={() => saveStellungnahme.run()}>
              Speichern
            </Button>
            {saveStellungnahme.error && <p className="text-[11px] text-status-danger">{saveStellungnahme.error}</p>}
          </div>
        )}
      </div>

      {/* Abschluss */}
      <div className={box}>
        <strong className="text-xs text-foreground">Abschluss der Maßnahme</strong>
        <p className="mb-2 mt-1 text-[11px] text-muted-foreground">
          Der Abschluss setzt einen hinterlegten Nachweis und eine Bestätigung durch die Revision
          voraus — nicht durch den Maßnahmenverantwortlichen allein.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Erledigungsnachweis" value={abschlussForm.nachweis ?? ""} disabled={!canEditJson}
            onChange={(e) => setAbschlussForm((a) => ({ ...a, nachweis: e.target.value }))} className={input}
            aria-label="Erledigungsnachweis"
          />
          <input
            placeholder="Bestätigt durch (Revision)" value={abschlussForm.bestaetigtVon ?? ""} disabled={!canEditJson}
            onChange={(e) => setAbschlussForm((a) => ({ ...a, bestaetigtVon: e.target.value }))} className={input}
            aria-label="Bestätigt durch (Revision)"
          />
          <input
            type="date" value={abschlussForm.bestaetigtAm ?? ""} disabled={!canEditJson}
            onChange={(e) => setAbschlussForm((a) => ({ ...a, bestaetigtAm: e.target.value }))} className={input}
            aria-label="Bestätigt am"
          />
        </div>

        {f.status === "massnahme_erledigt" && !abschlussForm.nachweis && (
          <div className="mt-2 rounded-md border border-status-warning/30 bg-status-warning-bg px-2.5 py-1.5 text-[11px] text-status-warning">
            Als erledigt gemeldet, aber ohne Nachweis — Tz. 11 verlangt die Überwachung der
            Beseitigung in geeigneter Form, ein Satz Fließtext genügt nicht.
          </div>
        )}

        {abschlussArt === "restrisiko" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input
              placeholder="Beschreibung des Restrisikos" value={abschlussForm.restrisiko ?? ""} disabled={!canEditJson}
              onChange={(e) => setAbschlussForm((a) => ({ ...a, restrisiko: e.target.value }))} className={input}
              aria-label="Beschreibung des Restrisikos"
            />
            <input
              placeholder="Kompensierende Maßnahme" value={abschlussForm.kompensation ?? ""} disabled={!canEditJson}
              onChange={(e) => setAbschlussForm((a) => ({ ...a, kompensation: e.target.value }))} className={input}
              aria-label="Kompensierende Maßnahme"
            />
            <input
              placeholder="Restrisiko akzeptiert durch" value={abschlussForm.akzeptiertVon ?? ""} disabled={!canEditJson}
              onChange={(e) => setAbschlussForm((a) => ({ ...a, akzeptiertVon: e.target.value }))} className={input}
              aria-label="Restrisiko akzeptiert durch"
            />
          </div>
        )}

        {canEditJson && (
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={saveAbschluss.pending} onClick={() => saveAbschluss.run()}>
              Entwurf speichern
            </Button>
            {saveAbschluss.error && <p className="text-[11px] text-status-danger">{saveAbschluss.error}</p>}
          </div>
        )}

        {/* Statusübergänge */}
        {!closed && (
          <div className="mt-3 border-t border-border-subtle pt-2">
            {f.status === "offen" && (canWrite || isFachbereich) && (
              <Button className="px-2 py-1 text-[11px]" disabled={massnahmeErledigt.pending} onClick={() => massnahmeErledigt.run()}>
                Maßnahme als erledigt melden
              </Button>
            )}
            {f.status === "massnahme_erledigt" && canWrite && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={abschlussArt}
                  onChange={(e) => setAbschlussArt(e.target.value as "erledigt" | "restrisiko")}
                  className={input}
                  aria-label="Abschlussart"
                >
                  <option value="erledigt">Abschlussart: erledigt</option>
                  <option value="restrisiko">Abschlussart: Restrisiko akzeptiert</option>
                </select>
                <Button
                  className="px-2 py-1 text-[11px]"
                  disabled={schliessen.pending}
                  onClick={() => {
                    if (window.confirm("Nach dem Schließen ist diese Feststellung endgültig unveränderlich. Fortfahren?")) {
                      schliessen.run();
                    }
                  }}
                >
                  Schließen
                </Button>
              </div>
            )}
            {massnahmeErledigt.error && <p className="mt-1 text-[11px] text-status-danger">{massnahmeErledigt.error}</p>}
            {schliessen.error && <p className="mt-1 text-[11px] text-status-danger">{schliessen.error}</p>}
          </div>
        )}
      </div>

      {/* Tz. 8 — Geschäftsleiter-Eskalation */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-foreground">Richtet sich gegen einen Geschäftsleiter</div>
            <div className="text-[11px] text-muted-foreground">
              Tz. 8 — löst bei schwerwiegend/besonders schwerwiegend eine eigenständige Meldepflicht aus.
            </div>
          </div>
          <input
            type="checkbox" checked={f.executive_target} disabled={!canEditJson || toggleExecutiveTarget.pending}
            onChange={(e) => toggleExecutiveTarget.run(e.target.checked)}
            aria-label="Richtet sich gegen einen Geschäftsleiter"
          />
        </div>

        {execReq && (
          <div className="mt-3 border-t border-border-subtle pt-2">
            <strong className="text-xs text-foreground">
              Eskalation Tz. 8{" "}
              {execOpen ? <span className="text-status-danger">· offen</span> : <span className="text-status-success">· vollständig</span>}
            </strong>
            <p className="mb-2 mt-1 text-[11px] text-muted-foreground">
              Die Interne Revision berichtet unverzüglich der Geschäftsleitung; diese informiert
              unverzüglich BaFin und Deutsche Bundesbank.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <input type="date" value={execForm.glDate ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, glDate: e.target.value }))} className={input} aria-label="Geschäftsleitung informiert am" />
                <input placeholder="informiert durch" value={execForm.glBy ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, glBy: e.target.value }))} className={input} aria-label="informiert durch" />
              </div>
              <div className="space-y-1">
                <input type="date" value={execForm.bafinDate ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, bafinDate: e.target.value }))} className={input} aria-label="BaFin informiert am" />
                <input placeholder="informiert durch (GL)" value={execForm.bafinBy ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, bafinBy: e.target.value }))} className={input} aria-label="informiert durch (GL)" />
              </div>
              <div className="space-y-1">
                <input type="date" value={execForm.bundesbankDate ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, bundesbankDate: e.target.value }))} className={input} aria-label="Deutsche Bundesbank informiert am" />
                <input placeholder="informiert durch (GL)" value={execForm.bundesbankBy ?? ""} disabled={!canEditJson}
                  onChange={(e) => setExecForm((s) => ({ ...s, bundesbankBy: e.target.value }))} className={input} aria-label="informiert durch (GL)" />
              </div>
            </div>
            {canEditJson && (
              <div className="mt-2 flex items-center gap-2">
                <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={saveExec.pending} onClick={() => saveExec.run()}>
                  Speichern
                </Button>
                {saveExec.error && <p className="text-[11px] text-status-danger">{saveExec.error}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tz. 11 — Nachschau */}
      <div className={box}>
        <strong className="text-xs text-foreground">Überwachung der Beseitigung (Tz. 11)</strong>
        <p className="mb-2 mt-1 text-[11px] text-muted-foreground">Gilt für jede Feststellung, auch für Mängel mit geringer Risikorelevanz.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={nachschauNeeded} disabled={!canEditJson}
              onChange={(e) => setNachschauNeeded(e.target.checked)} />
            Nachschauprüfung angesetzt
          </label>
          <input type="date" value={nachschauDate} disabled={!canEditJson || !nachschauNeeded}
            onChange={(e) => setNachschauDate(e.target.value)} className={input} aria-label="Datum der Nachschauprüfung" />
        </div>
        {canEditJson && (
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={saveNachschau.pending} onClick={() => saveNachschau.run()}>
              Speichern
            </Button>
            {saveNachschau.error && <p className="text-[11px] text-status-danger">{saveNachschau.error}</p>}
          </div>
        )}
      </div>

      {/* Tz. 12 — Eskalation bei nicht fristgerechter Beseitigung (nur wesentliche Mängel) */}
      {showTz12 && (
        <div className={box}>
          <strong className="text-xs text-foreground">Eskalation bei nicht fristgerechter Beseitigung (Tz. 12)</strong>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Zuständige GL-Mitglieder informiert am (Tz. 12 S.1)</label>
              <input type="date" value={escalationForm.zustaendigeGlDate ?? ""} disabled={!canEditJson}
                onChange={(e) => setEscalationForm((s) => ({ ...s, zustaendigeGlDate: e.target.value }))} className={input} aria-label="Zuständige GL-Mitglieder informiert am (Tz. 12 S.1)" />
              <input placeholder="informiert durch (Leiter IR)" value={escalationForm.zustaendigeGlBy ?? ""} disabled={!canEditJson}
                onChange={(e) => setEscalationForm((s) => ({ ...s, zustaendigeGlBy: e.target.value }))} className={input} aria-label="informiert durch (Leiter IR)" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Gesamte Geschäftsleitung informiert am (Tz. 12 S.2)</label>
              <input type="date" value={escalationForm.gesamteGlDate ?? ""} disabled={!canEditJson || !escalationForm.zustaendigeGlDate}
                onChange={(e) => setEscalationForm((s) => ({ ...s, gesamteGlDate: e.target.value }))} className={input} aria-label="Gesamte Geschäftsleitung informiert am (Tz. 12 S.2)" />
              <input placeholder="informiert durch" value={escalationForm.gesamteGlBy ?? ""} disabled={!canEditJson || !escalationForm.zustaendigeGlDate}
                onChange={(e) => setEscalationForm((s) => ({ ...s, gesamteGlBy: e.target.value }))} className={input} aria-label="informiert durch" />
            </div>
          </div>
          {canEditJson && (
            <div className="mt-2 flex items-center gap-2">
              <Button variant="secondary" className="px-2 py-1 text-[11px]" disabled={saveEscalation.pending} onClick={() => saveEscalation.run()}>
                Speichern
              </Button>
              {saveEscalation.error && <p className="text-[11px] text-status-danger">{saveEscalation.error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
