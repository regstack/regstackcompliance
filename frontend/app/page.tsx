import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

// proxy.ts leaves "/" public for signed-out visitors (redirects signed-in
// users straight to /outsourcing), so this renders as the marketing page.

const USPS = [
  {
    title: "Automatisierung regulatorischer Workflows",
    kicker: "Weniger Aufwand. Weniger Kosten.",
    body: "Prüf-, Dokumentations- und Berichtsprozesse laufen automatisiert — über Auslagerungsmanagement, Compliance und Interne Revision hinweg. Klare Zuständigkeiten, automatische Fristenerinnerungen und Eskalation, wenn etwas liegen bleibt.",
  },
  {
    title: "Führungs-Dashboard für regulatorische Arbeitsstände",
    kicker: "Sie sehen jederzeit, wo Ihr Haus steht.",
    body: "Welche wesentlichen Auslagerungen laufen, welche Risikoanalysen und Verträge offen sind, wo Fristen kippen — plus Prüfungsbereitschaftsgrad als Live-Kennzahl. Nachweisbare Überwachung nach § 25b KWG.",
  },
  {
    title: "Audit-ready Daten",
    kicker: "Prüfungsbereit ab Tag eins.",
    body: "Jede Entscheidung strukturiert erfasst, inklusive Begründung nach der 9. MaRisk-Novelle. Register, Nachweise und Prüfungsakten exportierbar — mit scoped, read-only Prüferzugang, jeder Zugriff protokolliert.",
  },
];

const MODULES = [
  {
    title: "Auslagerungsmanagement",
    body: "Klassifizierung, Risikoanalyse, Verträge und Weiterverlagerungen gemäß MaRisk AT 9 — inklusive Wesentlichkeits- und Risikobewertung.",
  },
  {
    title: "Compliance",
    body: "Normenregister, Feststellungen, Governance und Berichte an einem Ort, mit Nachweisen und Überwachung pro Normzuweisung.",
  },
  {
    title: "Interne Revision",
    body: "Prüfungsuniversum, Prüfungsplanung, Feststellungen und Jahres- bzw. Quartalsberichte in einem durchgängigen Workflow.",
  },
];

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-copper-500" />
            <span className="text-sm font-semibold tracking-wide text-foreground">
              RegStack
            </span>
          </div>
          <Link href="/login">
            <Button variant="secondary">Anmelden</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Das MaRisk-Cockpit für regulierte Finanzinstitute
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            RegStack bündelt Auslagerungsmanagement, Compliance und Interne
            Revision in einer Anwendung — mit Audit-Trail, RBAC und
            EU-Hosting als Grundprinzip statt als Zusatzfunktion.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="primary">Zum Login</Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Über uns
            </h2>
            <p className="mt-3 max-w-3xl text-lg text-foreground">
              RegStack entsteht als der Produktivbau hinter dem
              MaRisk-Cockpit-Prototyp: eine Plattform, die Institute bei der
              Umsetzung der Mindestanforderungen an das Risikomanagement
              (MaRisk AT 9) unterstützt — von der Klassifizierung
              einer Auslagerung bis zum revisionssicheren Nachweis gegenüber
              Aufsicht und Wirtschaftsprüfung.
            </p>
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
              Statt Compliance als nachträgliche Dokumentation zu behandeln,
              bauen wir sie in die Anwendung selbst ein: jeder Schreibzugriff
              erzeugt automatisch seinen Nachweis, jede Berechtigung wird auf
              dem Server geprüft, und jede Institution behält die
              Datenhoheit in der EU.
            </p>

            <div className="mt-8 rounded-lg border border-copper-500/30 bg-copper-500/[0.06] px-5 py-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-copper-400">
                  Gebaut von Praktikern, nicht von der Stange.
                </span>{" "}
                Im Gründerteam steckt echte Audit- und
                Compliance-Erfahrung aus mehreren regulierten Instituten —
                wir kennen die Excel-Listen, Medienbrüche und
                Prüfungsrunden, die RegStack ersetzt, aus eigener Praxis.
                Diese Erfahrung steckt in jedem Workflow, nicht nur im
                Pitch.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ihr Vorteil
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {USPS.map((usp) => (
              <Card key={usp.title}>
                <CardBody>
                  <h3 className="text-sm font-semibold text-copper-400">
                    {usp.kicker}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {usp.title}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {usp.body}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Module
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {MODULES.map((mod) => (
                <Card key={mod.title}>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-foreground">
                      {mod.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {mod.body}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} RegStack
        </div>
      </footer>
    </div>
  );
}
