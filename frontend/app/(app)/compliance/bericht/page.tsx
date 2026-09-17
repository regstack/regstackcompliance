import { listReports } from "@/lib/regstack/compliance";
import { getSessionContext, canWriteCompliance, isGeschaeftsleitung } from "@/lib/regstack/session";
import { Banner } from "@/components/ui/banner";
import { Card, CardBody } from "@/components/ui/card";
import { ReportsPanel } from "@/components/compliance/reports-panel";
import { asContent } from "@/lib/regstack/compliance-utils";

const SECTIONS = [
  { sec: "Gesamtrating und Zusammenfassung", from: "Risikoinventar + Periodenrating" },
  { sec: "Rechtliches und regulatorisches Umfeld", from: "Änderungseingang der Periode" },
  { sec: "Ergebnisse der Kontrollen", from: "Kontrollplan — Durchführungsnachweise" },
  { sec: "Kennzahlen", from: "Dashboard" },
  { sec: "Offene Feststellungen", from: "Feststellungs- und Maßnahmenregister" },
  { sec: "Beratung, Schulung und Sensibilisierung", from: "Register Beratung & Schulung" },
];

export default async function BerichtPage() {
  const ctx = await getSessionContext();
  const reports = await listReports();
  const canFinalize = ctx ? canWriteCompliance(ctx) : false;
  const canAck = ctx ? isGeschaeftsleitung(ctx) : false;
  const current = reports.find((r) => r.report_type === "quartalsbericht" && r.status === "entwurf") ?? reports[0];
  const currentContent = current ? asContent(current.content) : null;

  return (
    <div className="space-y-6">
      <Banner title="Quartalsbericht als Regelfall">
        Tz. 6 verlangt mindestens jährlich. Das Cockpit führt den Quartalsbericht als Regelfall
        und den Jahresbericht als Verdichtung der vier Quartale. Die Abschnitte werden aus den
        Daten der übrigen Bereiche erzeugt, nicht separat verfasst.
      </Banner>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Berichtshistorie</h2>
        <ReportsPanel reports={reports} canFinalize={canFinalize} canAck={canAck} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Abschnittsherkunft des Quartalsberichts</h3>
            <table className="w-full text-sm">
              <tbody>
                {SECTIONS.map((s) => (
                  <tr key={s.sec} className="border-b border-border-subtle last:border-0">
                    <td className="py-1.5 pr-3 text-foreground">{s.sec}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">{s.from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {current && currentContent && (
          <Card>
            <CardBody>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{currentContent.name ?? "Aktueller Bericht"} — Pflichtfelder</h3>
              <dl className="space-y-2 text-sm">
                {currentContent.rating && (
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gesamtrating</dt><dd className="text-foreground">{currentContent.rating}</dd></div>
                )}
                {currentContent.defizite && (
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Festgestellte Defizite</dt><dd className="text-muted-foreground">{currentContent.defizite}</dd></div>
                )}
                {currentContent.gegenmassnahmen && (
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gegenmaßnahmen</dt><dd className="text-muted-foreground">{currentContent.gegenmassnahmen}</dd></div>
                )}
              </dl>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
