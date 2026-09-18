// Small badge for status values that have no natural place in the shared StatusPill tone map
// (components/ui/status-pill.tsx, out of scope to edit) — Prüfungsschritt-Beurteilung and a
// couple of QS-Checkliste states. Visually identical to StatusPill, just with an explicit tone.
type Tone = "success" | "warning" | "danger" | "open" | "accent";

const TONES: Record<Tone, string> = {
  success: "text-status-success bg-status-success-bg border-status-success/30",
  warning: "text-status-warning bg-status-warning-bg border-status-warning/30",
  danger: "text-status-danger bg-status-danger-bg border-status-danger/30",
  open: "text-status-open bg-status-open-bg border-status-open/30",
  accent: "text-copper-300 bg-copper-700/20 border-copper-500/40",
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
