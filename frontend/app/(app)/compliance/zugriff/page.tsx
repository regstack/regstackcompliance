import { listGremien, listEreignisse, naechsteFaelligkeit, isOverdue } from "@/lib/regstack/compliance";
import { Banner } from "@/components/ui/banner";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export default async function ZugriffPage() {
  const [gremien, ereignisse] = await Promise.all([listGremien(), listEreignisse()]);

  return (
    <div className="space-y-6">
      <Banner title="Von der Zusicherung zum Nachweis">
        Ein Häkchen &bdquo;Zugriff bestätigt&ldquo; ist im Prüfungsgespräch wenig wert. Belastbar
        sind stehende Sitze in Gremien und stehende Zulieferungen — jeweils mit Turnus und
        letztem Eingang.
      </Banner>

      <Card>
        <CardHeader><CardTitle>Gremien & stehende Zulieferungen</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Art</th><th className="px-2 py-2 font-medium">Bezeichnung</th>
                <th className="px-2 py-2 font-medium">Grundlage</th><th className="px-2 py-2 font-medium">Turnus</th>
                <th className="px-2 py-2 font-medium">Letzter Eingang</th><th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {gremien.map((g) => {
                const fixed = g.turnus === "laufend" || g.turnus === "anlassbezogen";
                const due = naechsteFaelligkeit(g.letzter_eingang, g.turnus);
                const overdue = !fixed && isOverdue(due);
                return (
                  <tr key={g.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2"><StatusPill status="open" label={g.typ} /></td>
                    <td className="px-2 py-2 font-medium text-foreground">{g.bezeichnung}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{g.grundlage}</td>
                    <td className="px-2 py-2 text-muted-foreground">{g.turnus}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{g.letzter_eingang ?? "—"}</td>
                    <td className="px-2 py-2"><StatusPill status={overdue ? "beendet" : "bestaetigt"} label={overdue ? "überfällig" : fixed ? g.turnus! : "aktuell"} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ereigniseingang AT 8.1 / 8.2 / AT 9</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Eingang</th><th className="px-2 py-2 font-medium">Auslöser</th>
                <th className="px-2 py-2 font-medium">Gegenstand</th><th className="px-2 py-2 font-medium">Beteiligung</th><th className="px-2 py-2 font-medium">Votum</th>
              </tr>
            </thead>
            <tbody>
              {ereignisse.map((e) => (
                <tr key={e.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{e.datum}</td>
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{e.ausloeser}</td>
                  <td className="px-2 py-2 font-medium text-foreground">{e.gegenstand}</td>
                  <td className="px-2 py-2 text-muted-foreground">{e.beteiligung}</td>
                  <td className="px-2 py-2"><StatusPill status={e.votum === "offen" ? "offen" : e.votum?.startsWith("ablehnend") ? "abgelehnt" : "bestaetigt"} label={e.votum ?? "—"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Eskalationspfad aus dem operativen Geschäft</h3>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li>Markt- und Marktfolgeeinheiten informieren die Compliance-Funktion unverzüglich bei jedem Fall mit mittlerem oder hohem Nichteinhaltungsrisiko.</li>
            <li>Compliance gibt eine dokumentierte Empfehlung zur Fortführung, Auflage oder Beendigung ab.</li>
            <li>Bei hohem Risiko oder bei Abweichung von der Empfehlung entscheidet die Geschäftsleitung abschließend.</li>
            <li>Jeder Fall dieser Stufen geht in den nächsten Quartalsbericht ein.</li>
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
