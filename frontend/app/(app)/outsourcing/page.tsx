import Link from "next/link";
import { listActivities } from "@/lib/regstack/outsourcing";
import { getBackendSession, canWriteOutsourcing } from "@/lib/regstack/backend-session";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ActivityForm } from "@/components/outsourcing/activity-form";
import { Walkthrough, type WalkthroughStep } from "@/components/ui/walkthrough";

export default async function OutsourcingPage() {
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
  const canWrite = canWriteOutsourcing(session.role);

  const walkthroughSteps: WalkthroughStep[] = [
    {
      title: "Auslagerungsregister",
      body: "Hier sehen Sie alle Auslagerungen Ihrer Institution auf einen Blick — Wesentlichkeit und Status je Aktivität.",
    },
    ...(canWrite
      ? [
          {
            title: "Neue Auslagerung erfassen",
            body: "Über „Neue Auslagerung“ legen Sie eine neue Aktivität an und pflegen Stammdaten, Wesentlichkeit und Vertrag.",
          },
        ]
      : []),
    {
      title: "Bericht & DORA-Register",
      body: "In der Seitenleiste finden Sie den Bericht über die Auslagerungen (Tz. 13) sowie das DORA-Register für IKT-Drittanbieter.",
    },
  ];

  return (
    <div>
      <Walkthrough id="outsourcing-register" steps={walkthroughSteps} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Auslagerungsregister</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AT 9 — alle Auslagerungen Ihrer Institution.
          </p>
        </div>
        {canWrite && <ActivityForm />}
      </div>

      {activities.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Keine Auslagerungen sichtbar — das Register ist noch leer.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Bezeichnung</th>
                <th className="px-5 py-3 font-medium">Anbieter</th>
                <th className="px-5 py-3 font-medium">Wesentlichkeit</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-raised"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/outsourcing/${a.id}`}
                      className="font-medium text-foreground hover:text-copper-300"
                    >
                      {a.name}
                    </Link>
                    {a.category && <div className="text-xs text-muted-foreground">{a.category}</div>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{a.provider ?? "—"}</td>
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
                    <StatusPill status={a.status.toLowerCase()} />
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
