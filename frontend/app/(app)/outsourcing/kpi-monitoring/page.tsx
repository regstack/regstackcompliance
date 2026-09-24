import Link from "next/link";
import { listMonitoringKpis } from "@/lib/regstack/outsourcing";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("de-DE") : "–";
}

export default async function KpiMonitoringPage() {
  const session = await getBackendSession();
  if (!session) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm text-foreground">Ihr Konto ist nicht mit dem RegStack-Backend verknüpft.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Bitte melden Sie sich erneut an, oder wenden Sie sich an einen Administrator.
        </p>
      </Card>
    );
  }

  const kpis = await listMonitoringKpis();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">KPI/KRI-Monitoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kennzahlen aus dem laufenden Monitoring, institutionsweit über alle Auslagerungen — Tz. 9.
        </p>
      </div>

      {kpis.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine KPIs erfasst — Kennzahlen werden im Monitoring-Reiter je Auslagerung angelegt.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Auslagerung</th>
                <th className="px-5 py-3 font-medium">KPI</th>
                <th className="px-5 py-3 font-medium">Zielwert</th>
                <th className="px-5 py-3 font-medium">Ist-Wert</th>
                <th className="px-5 py-3 font-medium">Erfasst am</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                  <td className="px-5 py-3">
                    <Link
                      href={`/outsourcing/${k.activity.id}`}
                      className="font-medium text-foreground hover:text-copper-300"
                    >
                      {k.activity.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-foreground">{k.kpiName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{k.kpiTarget ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{k.kpiAchieved ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{fmt(k.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
