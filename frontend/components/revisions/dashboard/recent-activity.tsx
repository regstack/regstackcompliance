import { Card } from "@/components/ui/card";

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  occurred_at: string | null;
  details: unknown;
};

function describeDetails(details: unknown, entityType: string | null): string {
  if (details && typeof details === "object" && "object" in (details as Record<string, unknown>)) {
    const v = (details as { object?: unknown }).object;
    if (typeof v === "string" && v) return v;
  }
  return entityType ?? "";
}

export function RecentActivity({ rows }: { rows: AuditLogRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border-subtle px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Letzte Aktivitäten</h3>
      </div>
      <div className="divide-y divide-border-subtle">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3 px-5 py-2.5 text-sm">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.occurred_at?.slice(0, 16).replace("T", " ") ?? "—"}</span>
            <span className="text-foreground">
              {r.action}
              {describeDetails(r.details, r.entity_type) && (
                <span className="ml-1.5 text-xs text-muted-foreground">({describeDetails(r.details, r.entity_type)})</span>
              )}
            </span>
          </div>
        ))}
        {rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-muted-foreground">Noch keine Audit-Trail-Einträge.</div>}
      </div>
    </Card>
  );
}
