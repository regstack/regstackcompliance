import {
  listBeauftragte, listFunktionswechsel, listErleichterungen, listStellenbeschreibungen,
  getGovernanceSettings, governanceWarnings, isOverdue,
} from "@/lib/regstack/compliance";
import { getBackendSession, canWriteCompliance } from "@/lib/regstack/backend-session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { StatusPill } from "@/components/ui/status-pill";
import { GovernanceSettingsForm } from "@/components/compliance/governance-settings-form";

const ACCESS_CLASSES = [
  { cls: "Klasse 0 — Compliance (Power User)", roles: "Compliance-Funktion", access: "Voller Workflow", write: "Überwachungsplan, Feststellungen, Berichte, Wirksamkeitsbestätigung" },
  { cls: "Klasse 1 — Mitwirkende", roles: "Normverantwortlicher / Fachbereich", access: "Nur zugewiesene Normen", write: "Verlinkte Kontrollen bestätigen, Maßnahmen als erledigt melden, Nachweise hochladen" },
  { cls: "Klasse 2 — Einsicht & Entscheidung", roles: "Interne Revision (3rd line)", access: "Vollständiger Lesezugriff, inkl. Audit-Trail", write: "Keines — strukturell ausgeschlossen" },
  { cls: "Klasse 2 — Einsicht & Entscheidung", roles: "Geschäftsleitung", access: "Dashboard- und Berichtsansicht", write: "Nur die Entscheidung eskalierter Zuordnungsstreitigkeiten" },
];

export default async function GovernancePage() {
  const session = await getBackendSession();
  const [beauftragte, funktionswechsel, erleichterungen, stellenbeschreibungen, settings] = await Promise.all([
    listBeauftragte(), listFunktionswechsel(), listErleichterungen(), listStellenbeschreibungen(), getGovernanceSettings(),
  ]);
  const canWrite = session ? canWriteCompliance(session.role) : false;
  const warnings = governanceWarnings(beauftragte, erleichterungen, stellenbeschreibungen);

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <Banner tone="crit" title="Governance-Warnungen">
          {warnings.join(" · ")}
        </Banner>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Rollenkatalog</CardTitle></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Funktion</th><th className="px-2 py-2 font-medium">Inhaber</th>
                  <th className="px-2 py-2 font-medium">Stellvertretung</th><th className="px-2 py-2 font-medium">Bestellt</th>
                </tr>
              </thead>
              <tbody>
                {beauftragte.map((b) => (
                  <tr key={b.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2">
                      <div className="font-medium text-foreground">{b.funktion}</div>
                      <div className="font-mono text-[10.5px] text-muted-foreground">{b.rechtsgrundlage}</div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{b.inhaber?.full_name ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{b.stellvertretung?.full_name ?? "—"}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{b.bestellt_am ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Governance-Einstellungen</CardTitle></CardHeader>
          <CardBody>
            <GovernanceSettingsForm
              canWrite={canWrite}
              initial={{
                sonderfall_kleines_institut: settings?.sonderfall_kleines_institut ?? false,
                interessenkonflikt_massnahmen: settings?.interessenkonflikt_massnahmen ?? "",
                kombination_rationale: settings?.kombination_rationale ?? "",
                ressourcenausstattung: settings?.ressourcenausstattung ?? "",
              }}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Erleichterungen & Ausnahmen</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Gegenstand</th><th className="px-2 py-2 font-medium">Gewährt durch / am</th>
                <th className="px-2 py-2 font-medium">Reichweite</th><th className="px-2 py-2 font-medium">Formal / Materiell</th>
                <th className="px-2 py-2 font-medium">Überprüfung</th>
              </tr>
            </thead>
            <tbody>
              {erleichterungen.map((e) => (
                <tr key={e.id} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium text-foreground">{e.gegenstand}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{e.begruendung}</div>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{e.gewaehrt_durch}<div className="font-mono text-xs">{e.gewaehrt_am}</div></td>
                  <td className="px-2 py-2 text-muted-foreground">{e.reichweite}</td>
                  <td className="px-2 py-2">
                    <StatusPill status={e.formal_erleichtert ? "bestaetigt" : "offen"} label={e.formal_erleichtert ? "formal ja" : "formal nein"} />{" "}
                    <StatusPill status={e.materiell_erfuellt ? "bestaetigt" : "offen"} label={e.materiell_erfuellt ? "materiell ja" : "materiell nein"} />
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-mono text-xs text-muted-foreground">{e.ueberpruefung}</span>
                    {isOverdue(e.ueberpruefung) && <div className="mt-1"><StatusPill status="beendet" label="überfällig" /></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Funktionswechsel</CardTitle></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Datum</th><th className="px-2 py-2 font-medium">Funktion</th>
                  <th className="px-2 py-2 font-medium">Bisher</th><th className="px-2 py-2 font-medium">Neu</th>
                </tr>
              </thead>
              <tbody>
                {funktionswechsel.map((c) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{c.datum}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.funktion?.funktion ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.bisher_text}</td>
                    <td className="px-2 py-2 text-foreground">{c.neu?.full_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stellenbeschreibungen</CardTitle></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Dokument</th><th className="px-2 py-2 font-medium">Fassung</th><th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stellenbeschreibungen.map((j) => {
                  const overdue = isOverdue(j.naechste_ueberpruefung);
                  return (
                    <tr key={j.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-2 py-2 text-foreground">{j.dokument}</td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{j.fassung}</td>
                      <td className="px-2 py-2"><StatusPill status={overdue ? "beendet" : "bestaetigt"} label={overdue ? "Überprüfung fällig" : "aktuell"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Zugangsklassen & Berechtigungen</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Klasse</th><th className="px-2 py-2 font-medium">Rolle(n)</th>
                <th className="px-2 py-2 font-medium">Zugriff</th><th className="px-2 py-2 font-medium">Schreibrecht</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_CLASSES.map((a, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-2 py-2 font-medium text-foreground">{a.cls}</td>
                  <td className="px-2 py-2 text-muted-foreground">{a.roles}</td>
                  <td className="px-2 py-2 text-muted-foreground">{a.access}</td>
                  <td className="px-2 py-2 text-muted-foreground">{a.write}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
