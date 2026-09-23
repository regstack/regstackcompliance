import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { RegisterPreview } from "@/components/marketing/register-preview";
import {
  ShieldIcon,
  GaugeIcon,
  FileBarChartIcon,
  NetworkIcon,
  ScaleIcon,
  SearchCheckIcon,
} from "@/components/ui/icons";

// proxy.ts leaves "/" public for signed-out visitors (redirects signed-in
// users straight to /outsourcing), so this renders as the marketing page.

const BADGES = [
  "Audit-Trail auf jedem Write",
  "Serverseitige RBAC",
  "EU-Hosting (Frankfurt)",
];

const USPS = [
  {
    icon: GaugeIcon,
    title: "Automatisierung regulatorischer Workflows",
    kicker: "Weniger Aufwand. Weniger Kosten.",
    body: "Prüf-, Dokumentations- und Berichtsprozesse laufen automatisiert — über Auslagerungsmanagement, Compliance und Interne Revision hinweg. Klare Zuständigkeiten, automatische Fristenerinnerungen und Eskalation, wenn etwas liegen bleibt.",
  },
  {
    icon: FileBarChartIcon,
    title: "Führungs-Dashboard für regulatorische Arbeitsstände",
    kicker: "Sie sehen jederzeit, wo Ihr Haus steht.",
    body: "Welche wesentlichen Auslagerungen laufen, welche Risikoanalysen und Verträge offen sind, wo Fristen kippen — plus Prüfungsbereitschaftsgrad als Live-Kennzahl. Nachweisbare Überwachung nach § 25b KWG.",
  },
  {
    icon: SearchCheckIcon,
    title: "Audit-ready Daten",
    kicker: "Prüfungsbereit ab Tag eins.",
    body: "Jede Entscheidung strukturiert erfasst, inklusive Begründung nach der 9. MaRisk-Novelle. Register, Nachweise und Prüfungsakten exportierbar — mit scoped, read-only Prüferzugang, jeder Zugriff protokolliert.",
  },
];

const MODULES = [
  {
    icon: NetworkIcon,
    title: "Auslagerungsmanagement",
    body: "Klassifizierung, Risikoanalyse, Verträge und Weiterverlagerungen gemäß MaRisk AT 9 — inklusive Wesentlichkeits- und Risikobewertung.",
  },
  {
    icon: ScaleIcon,
    title: "Compliance",
    body: "Normenregister, Feststellungen, Governance und Berichte an einem Ort, mit Nachweisen und Überwachung pro Normzuweisung.",
  },
  {
    icon: SearchCheckIcon,
    title: "Interne Revision",
    body: "Prüfungsuniversum, Prüfungsplanung, Feststellungen und Jahres- bzw. Quartalsberichte in einem durchgängigen Workflow.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-copper-400">
      {children}
    </p>
  );
}

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-copper-400 to-copper-600 text-accent-foreground">
              <ShieldIcon width={18} height={18} strokeWidth={1.8} />
            </div>
            <span className="text-base font-semibold tracking-wide text-foreground">
              RegStack
            </span>
          </div>
          <Link href="/login">
            <Button variant="secondary" className="px-4 py-2.5 text-sm">
              Anmelden
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pb-28 sm:pt-28">
          <h1 className="mx-auto max-w-4xl font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Das MaRisk-Cockpit für regulierte Finanzinstitute
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            RegStack bündelt Auslagerungsmanagement, Compliance und Interne
            Revision in einer Anwendung — mit Audit-Trail, RBAC und
            EU-Hosting als Grundprinzip statt als Zusatzfunktion.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="primary" className="px-6 py-3 text-base">
                Zum Login
              </Button>
            </Link>
          </div>

          <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border-subtle bg-surface-raised px-4 py-2 text-sm text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-16">
            <RegisterPreview />
          </div>
        </section>

        {/* Über uns */}
        <section className="border-t border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <Eyebrow>Über uns</Eyebrow>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Der Produktivbau hinter dem MaRisk-Cockpit-Prototyp
            </h2>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-foreground">
              RegStack unterstützt Institute bei der Umsetzung der
              Mindestanforderungen an das Risikomanagement (MaRisk AT 9) —
              von der Klassifizierung einer Auslagerung bis zum
              revisionssicheren Nachweis gegenüber Aufsicht und
              Wirtschaftsprüfung.
            </p>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Statt Compliance als nachträgliche Dokumentation zu behandeln,
              bauen wir sie in die Anwendung selbst ein: jeder Schreibzugriff
              erzeugt automatisch seinen Nachweis, jede Berechtigung wird auf
              dem Server geprüft, und jede Institution behält die
              Datenhoheit in der EU.
            </p>

            <div className="mt-10 max-w-3xl rounded-2xl border border-copper-500/30 bg-copper-500/[0.06] px-6 py-6">
              <p className="text-base leading-relaxed text-foreground">
                <span className="font-semibold text-copper-400">
                  Gebaut von Praktikern, nicht von der Stange.
                </span>{" "}
                Im Gründerteam steckt echte Audit- und Compliance-Erfahrung
                aus mehreren regulierten Instituten — wir kennen die
                Excel-Listen, Medienbrüche und Prüfungsrunden, die RegStack
                ersetzt, aus eigener Praxis. Diese Erfahrung steckt in jedem
                Workflow, nicht nur im Pitch.
              </p>
            </div>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="border-t border-border-subtle">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <Eyebrow>Vision &amp; Mission</Eyebrow>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold text-copper-400">
                    Vision
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    Regulatorische Nachweispflicht darf kein
                    Fleißarbeit-Projekt aus Excel-Listen und E-Mail-Ketten
                    sein. Wir wollen, dass jedes regulierte Institut in der
                    EU seine Prüfungsbereitschaft jederzeit auf Knopfdruck
                    belegen kann — nicht erst in den Wochen vor der Prüfung.
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold text-copper-400">
                    Mission
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    RegStack macht Compliance zum Teil der täglichen Arbeit
                    statt zur Nacharbeit: Wir bauen Audit-Trail, RBAC und
                    Fristenmanagement direkt in die Workflows für
                    Auslagerungsmanagement, Compliance und Interne Revision
                    ein — damit Nachweis kein Sonderaufwand mehr ist,
                    sondern automatisches Nebenprodukt der Arbeit selbst.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        {/* Ihr Vorteil */}
        <section className="border-t border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <Eyebrow>Ihr Vorteil</Eyebrow>
            <div className="mt-10 space-y-10">
              {USPS.map((usp) => (
                <div
                  key={usp.title}
                  className="flex flex-col gap-5 border-b border-border-subtle pb-10 last:border-b-0 last:pb-0 sm:flex-row sm:items-start"
                >
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] border border-copper-500/30 bg-copper-500/[0.08] text-copper-400">
                    <usp.icon width={22} height={22} strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {usp.title}
                    </p>
                    <h3 className="mt-1.5 text-xl font-semibold text-foreground">
                      {usp.kicker}
                    </h3>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                      {usp.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Module */}
        <section className="border-t border-border-subtle">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <Eyebrow>Module</Eyebrow>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {MODULES.map((mod) => (
                <Card key={mod.title}>
                  <CardBody>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border-strong bg-surface text-copper-400">
                      <mod.icon width={18} height={18} strokeWidth={1.6} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      {mod.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
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
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} RegStack</span>
          <div className="flex gap-6">
            <Link href="/impressum" className="hover:text-copper-400">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-copper-400">
              Datenschutz
            </Link>
            <a
              href="mailto:admin@regstack.de"
              className="hover:text-copper-400"
            >
              admin@regstack.de
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
