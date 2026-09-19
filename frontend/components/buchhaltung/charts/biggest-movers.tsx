"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MoverDatum = {
  label: string;
  changePct: number;
  changeAbs: number;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: MoverDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sign = d.changeAbs >= 0 ? "+" : "";
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-foreground">{d.label}</div>
      <div className="text-muted-foreground">
        {sign}
        {new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(d.changeAbs)} € ({sign}
        {d.changePct.toFixed(1)} %)
      </div>
    </div>
  );
}

// Diverging pair (increase/decrease) around a neutral zero line — deliberately not the
// success/danger status tokens: a larger liability balance isn't "bad" the way a failed control
// is, it's just a direction of change, so financial polarity gets its own hues (see globals.css).
export function BiggestMovers({ data, height = 260 }: { data: MoverDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={210}
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="var(--chart-neutral)" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface)" }} />
        <Bar dataKey="changePct" radius={[4, 4, 4, 4]} maxBarSize={18}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.changePct >= 0 ? "var(--chart-increase)" : "var(--chart-decrease)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
