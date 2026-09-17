export function Kv({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-2.5 last:border-0">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {k}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
