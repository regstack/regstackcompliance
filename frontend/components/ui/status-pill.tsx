type Tone = "success" | "warning" | "danger" | "open" | "accent";

const tones: Record<Tone, string> = {
  success: "text-status-success bg-status-success-bg border-status-success/30",
  warning: "text-status-warning bg-status-warning-bg border-status-warning/30",
  danger: "text-status-danger bg-status-danger-bg border-status-danger/30",
  open: "text-status-open bg-status-open-bg border-status-open/30",
  accent: "text-copper-300 bg-copper-700/20 border-copper-500/40",
};

// Maps the actual DB status values used across the Outsourcing schema
// (auslagerungen.status, auslagerung_vertragscheckliste.status, etc.) to a tone.
const STATUS_TONE: Record<string, Tone> = {
  aktiv: "success",
  in_entwicklung: "open",
  ausser_betrieb: "danger",
  erfuellt: "success",
  bestaetigt: "success",
  offen: "open",
  entwurf: "open",
  beendet: "danger",
  in_pruefung: "warning",
  nicht_erforderlich: "warning",
  nicht_erfuellt: "danger",
  in_ueberarbeitung: "warning",
  entfernt: "danger",
  abgelehnt: "danger",
  wesentlich: "accent",
  nicht_wesentlich: "open",
  // Compliance: Normen / Feststellungen / regulatorische Änderungen / Handshakes
  relevant: "accent",
  nicht_relevant: "open",
  entfallen: "danger",
  fachbereich_erledigt: "warning",
  wirksamkeit_bestaetigt: "success",
  geschlossen: "success",
  akzeptiertes_risiko: "warning",
  vorschlag: "warning",
  widersprochen: "danger",
  entschieden: "success",
  geprueft: "success",
  kenntnis: "open",
  angewandt: "success",
  projekt: "warning",
  hoch: "danger",
  mittel: "warning",
  gering: "open",
  kritisch: "danger",
  // Compliance: Kontrollen (Wirksamkeit), Compliance-Rating, Matrix-Abdeckung, Kontrollbewertung
  final: "success",
  versendet: "success",
  wirksam: "success",
  "eingeschraenkt wirksam": "warning",
  "in Aufbau": "danger",
  gruen: "success",
  "gruen-gelb": "warning",
  gelb: "warning",
  rot: "danger",
  vollstaendig: "success",
  eingeschraenkt: "warning",
  luekenhaft: "danger",
  keine: "danger",
  stark: "success",
  schwach: "danger",
  // Interne Revision: Prüfungsuniversum / Prüfungen / Feststellungen / Eskalationsstufen
  geplant: "open",
  laufend: "warning",
  abgeschlossen: "success",
  never: "danger",
  overdue: "danger",
  due_soon: "warning",
  on_time: "success",
  besonders_schwerwiegend: "danger",
  schwerwiegend: "danger",
  geringfuegig: "open",
  massnahme_erledigt: "warning",
  in_arbeit: "open",
  vorgelegt: "warning",
  freigegeben: "success",
  nachbesserung: "danger",
  eskalation_faellig: "danger",
  zustaendige_gl: "warning",
  gesamte_gl_faellig: "danger",
  gesamte_gl: "warning",
  erledigt: "success",
  restrisiko: "accent",
  gut: "success",
  befriedigend: "accent",
  verbesserungsbeduerftig: "warning",
  unzureichend: "danger",
  eingereicht: "warning",
  genehmigt: "success",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONE[status] ?? "open";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${tones[tone]}`}
    >
      {(label ?? status).replaceAll("_", " ")}
    </span>
  );
}
