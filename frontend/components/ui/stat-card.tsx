import { Card } from "@/components/ui/card";

type Tone = "neutral" | "good" | "warn" | "crit";

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-foreground",
  good: "text-status-success",
  warn: "text-status-warning",
  crit: "text-status-danger",
};

export function StatCard({
  label, value, hint, tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className="flex flex-col gap-1.5 px-4 py-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-2xl font-semibold leading-none ${VALUE_TONE[tone]}`}>{value}</div>
      {hint && <div className="text-xs leading-snug text-muted-foreground">{hint}</div>}
    </Card>
  );
}
