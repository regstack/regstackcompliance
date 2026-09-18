type Tone = "info" | "warn" | "crit";

const TONE_CLASSES: Record<Tone, string> = {
  info: "border-copper-500/30 bg-copper-700/10 text-copper-100",
  warn: "border-status-warning/30 bg-status-warning-bg text-status-warning",
  crit: "border-status-danger/30 bg-status-danger-bg text-status-danger",
};

export function Banner({
  tone = "info", title, children,
}: {
  tone?: Tone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
