import Link from "next/link";
import { listActivities } from "@/lib/regstack/outsourcing";
import { getBackendSession } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export default async function RisikoanalysenPage() {
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

  const activities = await listActivities();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Risikoanalysen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wesentlichkeitseinstufung und Kritikalität je Auslagerung — Tz. 1, AT 9.
        </p>
      </div>

      {activities.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Keine Auslagerungen erfasst.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Auslagerung</th>
                <th className="px-5 py-3 font-medium">Wesentlichkeit</th>
                <th className="px-5 py-3 font-medium">Kritikalität</th>
                <th className="px-5 py-3 font-medium">Inhärentes Risiko</th>
                <th className="px-5 py-3 font-medium">Override</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                  <td className="px-5 py-3">
                    <Link href={`/outsourcing/${a.id}`} className="font-medium text-foreground hover:text-copper-300">
                      {a.name}
                    </Link>
                    {a.provider && <div className="text-xs text-muted-foreground">{a.provider}</div>}
                  </td>
                  <td className="px-5 py-3">
                    {a.riskAnalysis?.materiality === true ? (
                      <StatusPill status="wesentlich" />
                    ) : a.riskAnalysis?.materiality === false ? (
                      <StatusPill status="nicht_wesentlich" />
                    ) : (
                      <span className="text-muted-foreground">nicht eingestuft</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={(a.riskAnalysis?.criticality ?? "OFFEN").toLowerCase()} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{a.riskAnalysis?.inherentScore ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {a.riskAnalysis?.overrideActive
                      ? `${a.riskAnalysis.overrideMaterial ? "wesentlich" : "nicht wesentlich"} (${a.riskAnalysis.overrideApprover ?? "—"})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
