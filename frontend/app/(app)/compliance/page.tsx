import {
  listNormen, listRisiken, listKontrollen, listQuellen, listAenderungen,
  listNormZuweisungHandshakes, listFeststellungen, listRatings, listBeauftragte,
  listErleichterungen, listStellenbeschreibungen, naechsteFaelligkeit, isOverdue,
  governanceWarnings,
} from "@/lib/regstack/compliance";
import { getBackendSession, canWriteCompliance } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Walkthrough, type WalkthroughStep } from "@/components/ui/walkthrough";
import { RatingForm } from "@/components/compliance/rating-form";

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Compliance-Dashboard",
    body: "Rating der Periode, wesentliche Regelungen und offene Punkte auf einen Blick — Tz. 6.",
  },
  {
    title: "Rechtsnormenkataster & Überwachung",
    body: "In der Seitenleiste erfassen und prüfen Sie Regelungen und behalten die Überwachung von Quellen und Änderungen im Blick — Tz. 2.",
  },
  {
    title: "Risiken, Kontrollen & Feststellungen",
    body: "Risiken & Kontrollen, die Nachweis-Ablage sowie Feststellungen & Maßnahmen finden Sie als eigene Bereiche — Tz. 1.",
  },
  {
    title: "Organisation & Berichte",
    body: "Governance & Beauftragte, Informationsrechte sowie der Bericht an die Geschäftsleitung inkl. Audit-Trail und Prüfer-Export runden das Modul ab — Tz. 3–6.",
  },
];

const CHAIN = [
  "Überwachungsquelle", "Regulatorische Änderung", "Regelung (Kataster)", "Compliance-Risiko",
  "Kontrolle", "Kontrolldurchführung", "Feststellung & Maßnahme", "Bericht",
];

const AT442_MAPPING = [
  { tz: "1", req: "Steuerung von Non-Compliance-Risiken; wirksame Verfahren und Kontrollen; Beratung der Geschäftsleitung", impl: "Risikoinventar, Kontrollplan mit Turnus/Fälligkeit/Durchführungsnachweis, Beratung & Schulung" },
  { tz: "2", req: "Regelmäßige, risikobasierte Identifikation wesentlicher rechtlicher Regelungen", impl: "Rechtsregister mit zweistufiger Einstufung; Überwachung mit Quellenregister und Änderungseingang" },
  { tz: "3", req: "Berichtslinie, Unabhängigkeit von Markt und Handel, Funktionskombinationen", impl: "Rollenkatalog mit Stellvertretung und Häufungswarnung, Funktionswechsel" },
  { tz: "4", req: "Benennung des Compliance-Beauftragten; Sonderfall sehr kleines Institut", impl: "Register der Erleichterungen, Stellenbeschreibungen" },
  { tz: "5", req: "Uneingeschränkter Informationszugriff; Zusammenarbeit mit dem Risikocontrolling", impl: "Gremien- und Zulieferungsregister, Ereigniseingang AT 8.1/8.2/AT 9, Eskalationspfad" },
  { tz: "6", req: "Mindestens jährlicher und anlassbezogener Bericht; Weitergabe an die Interne Revision", impl: "Quartalsbericht, Periodenrating mit Begründungszwang, Kenntnisnahme je Empfänger" },
];

export default async function CompliancePage() {
  const [session, normen, risiken, kontrollen, quellen, aenderungen, handshakes, feststellungen, ratings, beauftragte, erleichterungen, stellenbeschreibungen] =
    await Promise.all([
      getBackendSession(),
      listNormen(), listRisiken(), listKontrollen(), listQuellen(), listAenderungen(),
      listNormZuweisungHandshakes(), listFeststellungen(), listRatings(), listBeauftragte(),
      listErleichterungen(), listStellenbeschreibungen(),
    ]);
  const canWrite = session ? canWriteCompliance(session.role) : false;

  const wesentlich = normen.filter((n) => n.wesentlichkeit === "wesentlich").length;
  const relevantNichtWesentlich = normen.filter((n) => n.relevanz === "relevant" && n.wesentlichkeit === "nicht_wesentlich").length;
  const nichtRelevant = normen.filter((n) => n.relevanz === "nicht_relevant").length;

  const restrisikoHoch = risiken.filter((r) => r.restrisiko === "hoch");
  const overdueKontrollen = kontrollen.filter((k) => isOverdue(k.naechste_faelligkeit));
  const overdueQuellen = quellen.filter((q) => isOverdue(naechsteFaelligkeit(q.letzte_durchsicht, q.turnus)));
  const offeneAenderungen = aenderungen.filter((a) => a.disposition === "offen");
  const warnings = governanceWarnings(beauftragte, erleichterungen, stellenbeschreibungen);

  const pendingAssignments = handshakes.filter((h) => h.status === "vorschlag" || h.status === "widersprochen");
  const personalunionNormen = normen.filter((n) => n.personalunion).length;
  const openFindings = feststellungen.filter((f) => f.status !== "geschlossen" && f.status !== "akzeptiertes_risiko").length;
  const acceptedFindings = feststellungen.filter((f) => f.status === "akzeptiertes_risiko").length;

  const actualRatings = ratings.filter((r) => !r.periode.includes("Prognose"));
  const currentRating = actualRatings[actualRatings.length - 1] ?? null;
  const prevRating = actualRatings.length > 1 ? actualRatings[actualRatings.length - 2] : null;

  const inhDist = distribute(risiken.map((r) => r.inhaerent ?? "—"));
  const resDist = distribute(risiken.map((r) => r.restrisiko ?? "—"));
  const ctrlDist = distribute(kontrollen.map((k) => k.wirksamkeit ?? "—"));

  return (
    <div className="space-y-8">
      <Walkthrough id="compliance-dashboard" steps={WALKTHROUGH_STEPS} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Rating der Periode"
          value={currentRating?.rating ?? "—"}
          hint={currentRating ? `${currentRating.periode}${prevRating ? ` · Vorperiode: ${prevRating.rating}` : ""}` : "noch kein Rating erfasst"}
          tone={currentRating && currentRating.rating !== "gruen" ? "warn" : "good"}
        />
        <StatCard label="Wesentliche Regelungen" value={wesentlich} hint={`von ${normen.length} im Register geführt`} />
        <StatCard label="Restrisiko hoch" value={restrisikoHoch.length} hint={restrisikoHoch.map((r) => `Nr. ${r.nr}`).join(", ") || "keines"} tone={restrisikoHoch.length ? "crit" : "good"} />
        <StatCard
          label="Überfällig"
          value={overdueKontrollen.length + overdueQuellen.length}
          hint={`${overdueKontrollen.length} Kontrollen · ${overdueQuellen.length} Quellen`}
          tone={overdueKontrollen.length + overdueQuellen.length ? "warn" : "good"}
        />
        <StatCard label="Offene Änderungen" value={offeneAenderungen.length} hint={offeneAenderungen.length ? "ohne Disposition" : "alle disponiert"} tone={offeneAenderungen.length ? "warn" : "good"} />
        <StatCard label="Governance-Warnungen" value={warnings.length} hint={warnings.join(" · ") || "keine offenen Punkte"} tone={warnings.length ? "crit" : "good"} />
      </div>

      <section>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Compliance-Rating je Periode</h2>
          {canWrite && <RatingForm />}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Jede Änderung des Ratings verlangt eine dokumentierte Begründung. Tz. 6</p>
        <div className="flex flex-wrap gap-2.5">
          {ratings.map((r) => (
            <Card key={r.id} className={`min-w-[130px] flex-1 px-3.5 py-2.5 ${r.id === currentRating?.id ? "border-copper-500" : ""}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{r.periode}</div>
              <div className="mt-1.5"><StatusPill status={r.rating} /></div>
            </Card>
          ))}
        </div>
        {currentRating?.begruendung && (
          <Card className="mt-3 px-4 py-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pflichtbegründung der letzten Änderung</div>
            <p className="text-sm text-foreground">{currentRating.begruendung}</p>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold text-foreground">Registerstatistik</h2>
        <p className="mb-3 text-xs text-muted-foreground">Vollständigkeitsnachweis: auch geprüfte und verneinte Normen bleiben im Register. Tz. 2</p>
        <Card className="grid grid-cols-2 divide-y divide-border-subtle sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <MiniStat value={normen.length} label="Normen geprüft" />
          <MiniStat value={wesentlich} label="wesentlich" tone="good" />
          <MiniStat value={relevantNichtWesentlich} label="relevant, nicht wesentlich" />
          <MiniStat value={nichtRelevant} label="geprüft, nicht relevant" />
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold text-foreground">Objektkette — vom Impuls zum Bericht</h2>
        <p className="mb-3 text-xs text-muted-foreground">Woher wussten Sie von der Norm? Welches Risiko? Welche Kontrolle? Wann durchgeführt? Was kam heraus? Wer hat davon erfahren?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {CHAIN.map((step, i) => (
            <Card key={step} className="px-2.5 py-2.5 text-center">
              <div className="font-mono text-[10px] text-muted-foreground">{i + 1}</div>
              <div className="mt-0.5 text-[11px] font-medium text-foreground">{step}</div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Zuweisungen ausstehend" value={pendingAssignments.length} hint={pendingAssignments.length ? "Vorschlag oder Bestreitung offen" : "alle bestätigt oder entschieden"} tone={pendingAssignments.length ? "warn" : "good"} />
        <StatCard label="Personalunion-Normen" value={personalunionNormen} hint="Compliance ist selbst Fachbereich" tone={personalunionNormen ? "warn" : "neutral"} />
        <StatCard label="Offene Feststellungen" value={openFindings} hint={openFindings ? "siehe Feststellungsregister" : "keine offenen Feststellungen"} tone={openFindings ? "warn" : "good"} />
        <StatCard label="Akzeptierte Risiken" value={acceptedFindings} hint="mit dokumentierter Entscheidung" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Compliance-Risiken — brutto und netto</h3>
            <Dist title="Inhärent" dist={inhDist} order={["hoch", "mittel", "gering"]} />
            <div className="mt-4"><Dist title="Restrisiko nach Kontrollen" dist={resDist} order={["hoch", "mittel", "gering"]} /></div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Kontroll-Wirksamkeit</h3>
            <Dist title="" dist={ctrlDist} order={["wirksam", "eingeschraenkt wirksam", "in Aufbau"]} />
          </CardBody>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Zuordnung zu AT 4.4.2</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-12 px-3 py-2 font-medium">Tz</th>
                <th className="px-3 py-2 font-medium">Anforderung</th>
                <th className="px-3 py-2 font-medium">Umsetzung im Cockpit</th>
              </tr>
            </thead>
            <tbody>
              {AT442_MAPPING.map((row) => (
                <tr key={row.tz} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{row.tz}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.req}</td>
                  <td className="px-3 py-2.5 text-foreground">{row.impl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function MiniStat({ value, label, tone }: { value: number; label: string; tone?: "good" }) {
  return (
    <div className="px-4 py-3">
      <div className={`font-mono text-xl font-semibold ${tone === "good" ? "text-status-success" : "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function distribute(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return { counts, total: values.length };
}

const DIST_COLOR: Record<string, string> = {
  hoch: "bg-status-danger", mittel: "bg-status-warning", gering: "bg-status-success",
  wirksam: "bg-status-success", "eingeschraenkt wirksam": "bg-status-warning", "in Aufbau": "bg-status-danger",
};

function Dist({ title, dist, order }: { title: string; dist: { counts: Map<string, number>; total: number }; order: string[] }) {
  return (
    <div>
      {title && <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>}
      <div className="flex h-5 overflow-hidden rounded-md border border-border-subtle">
        {order.map((k) => {
          const n = dist.counts.get(k) ?? 0;
          const pct = dist.total ? (n / dist.total) * 100 : 0;
          return pct > 0 ? <div key={k} className={DIST_COLOR[k] ?? "bg-graphite-600"} style={{ width: `${pct}%` }} /> : null;
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {order.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className={`inline-block h-2 w-2 rounded-sm ${DIST_COLOR[k] ?? "bg-graphite-600"}`} />
            {k} ({dist.counts.get(k) ?? 0})
          </span>
        ))}
      </div>
    </div>
  );
}
