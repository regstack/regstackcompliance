import { listAuditLog } from "@/lib/regstack/revisions";
import { Card } from "@/components/ui/card";

function describeDetails(details: unknown, entityType: string | null): string {
  if (details && typeof details === "object" && "object" in (details as Record<string, unknown>)) {
    const v = (details as { object?: unknown }).object;
    if (typeof v === "string" && v) return v;
  }
  return entityType ?? "—";
}

export default async function RevisionAuditPage() {
  const audit = await listAuditLog();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Anlage und Änderungen im Prüfungsuniversum, Prüfungsstatus, Feststellungen samt Eskalationsstufen,
        Berichtsfreigaben und Governance-Einstellungen — unveränderlich protokolliert (kein UPDATE/DELETE auf
        dieser Tabelle). Vollständiges, uneingeschränktes Informations- und Zugriffsrecht ist der Internen
        Revision jederzeit zu gewährleisten (Tz. 1 S.3/4) — dieser Trail ist Teil davon.
      </p>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Aktion</th>
                <th className="px-3 py-2 font-medium">Objekt</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{a.occurred_at?.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{a.action}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{describeDetails(a.details, a.entity_type)}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Noch keine Audit-Trail-Einträge.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
