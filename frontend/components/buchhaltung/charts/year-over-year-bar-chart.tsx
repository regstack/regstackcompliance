"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type YearSeriesDatum = Record<string, string | number> & { category: string };

// Ordinal copper ramp (light→dark = older→newest fiscal year) — years have an inherent order, so
// this is an ordinal encoding, not an arbitrary categorical one. Validated against the card
// surface with the dataviz skill's palette validator (ordinal mode, all checks pass).
const YEAR_COLORS = ["var(--chart-year-1)", "var(--chart-year-2)", "var(--chart-year-3)"];

function formatEUR(value: number) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">{formatEUR(p.value)} €</span>
        </div>
      ))}
    </div>
  );
}

export function YearOverYearBarChart({
  data,
  years,
  height = 320,
}: {
  data: YearSeriesDatum[];
  years: number[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }} barCategoryGap="24%">
        <CartesianGrid horizontal={false} stroke="var(--border-subtle)" strokeDasharray="0" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${formatEUR(v / 1000)}k`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          width={190}
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        {years.map((year, i) => (
          <Bar
            key={year}
            dataKey={String(year)}
            name={String(year)}
            fill={YEAR_COLORS[i % YEAR_COLORS.length]}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
