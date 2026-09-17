import Link from "next/link";
import { listNormen } from "@/lib/regstack/compliance";
import { getSessionContext, canWriteCompliance } from "@/lib/regstack/session";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Banner } from "@/components/ui/banner";
import { NormListAdd } from "@/components/compliance/norm-list-add";

function classify(n: { relevanz: string | null; wesentlichkeit: string | null }) {
  if (n.relevanz === "nicht_relevant") return { label: "geprüft — nicht relevant", tone: "nicht_relevant" };
  if (n.wesentlichkeit === "wesentlich") return { label: "wesentlich", tone: "wesentlich" };
  if (n.wesentlichkeit === "nicht_wesentlich") return { label: "relevant, nicht wesentlich", tone: "relevant" };
  return { label: "Einstufung offen", tone: "offen" };
}

export default async function NormenPage() {
  const ctx = await getSessionContext();
  const normen = await listNormen();
  const canWrite = ctx ? canWriteCompliance(ctx) : false;

  return (
    <div className="space-y-6">
      <Banner tone="crit" title="Der Kataster ist kein Verzeichnis — er ist der Taktgeber des Überwachungsplans">
        Jede wesentliche Norm erzeugt eine datierte Überwachungshandlung mit Verantwortlichem. Kette:
        Überwachungsquelle → Regulatorische Änderung → Regelung → Compliance-Risiko → Kontrolle →
        Kontrolldurchführung → Feststellung → Bericht.
      </Banner>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Rechtsnormenkataster</h2>
          <p className="text-xs text-muted-foreground">Erst Relevanz für das Geschäftsmodell, dann Wesentlichkeit im Sinne der MaRisk.</p>
        </div>
        {canWrite && <NormListAdd />}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Regelung</th>
                <th className="px-3 py-2 font-medium">Sachgebiet</th>
                <th className="px-3 py-2 font-medium">Einstufung</th>
                <th className="px-3 py-2 font-medium">Risiko</th>
                <th className="px-3 py-2 font-medium">Normverantwortlicher</th>
                <th className="px-3 py-2 font-medium">Quelle</th>
              </tr>
            </thead>
            <tbody>
              {normen.map((n) => {
                const cls = classify(n);
                return (
                  <tr key={n.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
                    <td className="px-3 py-2.5">
                      <Link href={`/compliance/normen/${n.id}`} className="font-medium text-foreground hover:text-copper-300">
                        {n.bezeichnung}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{n.sachgebiet ?? "—"}</td>
                    <td className="px-3 py-2.5"><StatusPill status={cls.tone} label={cls.label} /></td>
                    <td className="px-3 py-2.5">{n.risiko ? <StatusPill status={n.risiko} /> : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {n.persons?.full_name ?? "—"}
                      {n.personalunion && <span className="ml-1.5"><StatusPill status="mittel" label="Personalunion" /></span>}
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status="open" label={n.status ?? "manuell"} /></td>
                  </tr>
                );
              })}
              {normen.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">Noch keine Regelungen erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
