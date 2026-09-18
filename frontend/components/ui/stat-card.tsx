import { Card } from "@/components/ui/card";

type Tone = "neutral" | "good" | "warn" | "crit";

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-foreground",
  good: "text-status-success",
  warn: "text-status-warning",
  crit: "text-status-danger",
};

const LABEL_TONE: Record<Tone, string> = {
  neutral: "text-graphite-500",
  good: "text-graphite-500",
  warn: "text-status-warning",
  crit: "text-status-danger",
};

const BORDER_TONE: Record<Tone, string> = {
  neutral: "",
  good: "",
  warn: "border-status-warning/25",
  crit: "border-status-danger/25",
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
    <Card className={`flex flex-col gap-2.5 px-5 py-[18px] ${BORDER_TONE[tone]}`}>
      <div className={`text-[10.5px] font-bold uppercase tracking-wide ${LABEL_TONE[tone]}`}>{label}</div>
      <div className={`font-serif text-[28px] font-semibold leading-none ${VALUE_TONE[tone]}`}>{value}</div>
      {hint && <div className="text-[11.5px] leading-snug text-muted-foreground">{hint}</div>}
    </Card>
  );
}
