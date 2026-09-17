import {
  listRisiken, listKontrollen, listNormRisikenLinks, listRisikoKontrollenLinks, listBeratung, listNormen,
  isOverdue, risksWithoutControl, normsWithoutControl, controlsWithoutOwner,
} from "@/lib/regstack/compliance";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export default async function RisikenPage() {
  const [risiken, kontrollen, normRisiken, risikoKontrollen, beratung, normen] = await Promise.all([
    listRisiken(), listKontrollen(), listNormRisikenLinks(), listRisikoKontrollenLinks(), listBeratung(), listNormen(),
  ]);

  const rwc = risksWithoutControl(risiken, risikoKontrollen);
  const nwc = normsWithoutControl(normen, kontrollen, normRisiken, risikoKontrollen);
  const cwo = controlsWithoutOwner(kontrollen);

  // Matrix rows: one per norm-risk link, with that risk's controls plus any control tied
  // directly to the norm with no risk link of its own (e.g. an "uebergreifend" self-assessment
  // control) — but never a control already claimed by one of the norm's OTHER risks, or a norm
  // with several risks would show every risk's controls under each of its rows.
  const allLinkedCtrlIds = new Set(risikoKontrollen.map((rk) => rk.kontrolle_id));
  const matrixRows = normRisiken.map((nr) => {
    const risk = risiken.find((r) => r.id === nr.risiko_id);
    const linkedCtrlIds = new Set(risikoKontrollen.filter((rk) => rk.risiko_id === nr.risiko_id).map((rk) => rk.kontrolle_id));
    const ctrls = kontrollen.filter((k) => linkedCtrlIds.has(k.id) || (k.norm_id === nr.norm_id && !allLinkedCtrlIds.has(k.id)));
    let coverage: "vollstaendig" | "eingeschraenkt" | "luekenhaft" | "keine" = "keine";
    if (ctrls.length > 0) {
      const anyWeak = ctrls.some((c) => c.wirksamkeit !== "wirksam");
      coverage = anyWeak ? "eingeschraenkt" : "vollstaendig";
    } else if (risk) {
      coverage = "luekenhaft";
    }
    return { norm: nr.normen?.bezeichnung ?? "—", risk, ctrls, coverage };
  });

  return (
    <div className="space-y-6">
      <Banner title="Manuelle Erfassung plus Import">
        Risiken und Kontrollen werden aktuell von der Compliance-Funktion gepflegt; ein
        Bulk-Import aus Excel/CSV für den Onboarding-Fall ist als Erweiterung vorgesehen.
      </Banner>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Lückenanalyse</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Normen ohne Kontrolle" value={nwc.length} hint={nwc.map((n) => n.bezeichnung).join(", ") || "keine offene Lücke"} tone={nwc.length ? "crit" : "good"} />
          <StatCard label="Risiken ohne Kontrolle" value={rwc.length} hint={rwc.map((r) => `Nr. ${r.nr}`).join(", ") || "keine offene Lücke"} tone={rwc.length ? "crit" : "good"} />
          <StatCard label="Kontrollen ohne Verantwortlichen" value={cwo.length} hint={cwo.map((c) => c.verfahren).join(", ") || "keine offene Lücke"} tone={cwo.length ? "crit" : "good"} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Compliance-Risikoinventar</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nr.</th><th className="px-3 py-2 font-medium">Risiko</th>
                  <th className="px-3 py-2 font-medium">Inhärent</th><th className="px-3 py-2 font-medium">Kontrollen</th>
                  <th className="px-3 py-2 font-medium">Restrisiko</th><th className="px-3 py-2 font-medium">Verantwortlich</th>
                  <th className="px-3 py-2 font-medium">Maßnahme</th>
                </tr>
              </thead>
              <tbody>
                {risiken.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0 align-top">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.nr}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{r.bezeichnung}</td>
                    <td className="px-3 py-2.5">{r.inhaerent && <StatusPill status={r.inhaerent} />}</td>
                    <td className="px-3 py-2.5">{r.kontrollbewertung && <StatusPill status={r.kontrollbewertung} />}</td>
                    <td className="px-3 py-2.5">{r.restrisiko && <StatusPill status={r.restrisiko} />}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.verantwortlich?.full_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.massnahme ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Kontrollplan</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Verfahren</th><th className="px-3 py-2 font-medium">Regelung</th>
                  <th className="px-3 py-2 font-medium">Turnus</th><th className="px-3 py-2 font-medium">Letzte Durchführung</th>
                  <th className="px-3 py-2 font-medium">Nächste fällig</th><th className="px-3 py-2 font-medium">Wirksamkeit</th>
                  <th className="px-3 py-2 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody>
                {kontrollen.map((k) => {
                  const overdue = isOverdue(k.naechste_faelligkeit);
                  return (
                    <tr key={k.id} className="border-b border-border-subtle last:border-0 align-top">
                      <td className="px-3 py-2.5 font-medium text-foreground">{k.verfahren}{k.prozess && <div className="text-xs font-normal text-muted-foreground">{k.prozess}</div>}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{k.normen?.bezeichnung ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{k.turnus ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{k.letzte_durchfuehrung ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-muted-foreground">{k.naechste_faelligkeit ?? "—"}</span>
                        {overdue && <div className="mt-1"><StatusPill status="beendet" label="überfällig" /></div>}
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={k.wirksamkeit} /></td>
                      <td className="px-3 py-2.5 text-muted-foreground">{k.verantwortlich?.full_name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Risiko-Kontroll-Matrix</h2>
        <p className="mb-3 text-xs text-muted-foreground">Eine Kontrolle kann mehrere Normen abdecken; eine Norm kann mehrere Kontrollen erfordern.</p>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Regelung</th><th className="px-3 py-2 font-medium">Risiko</th>
                  <th className="px-3 py-2 font-medium">Kontrolle(n)</th><th className="px-3 py-2 font-medium">Abdeckung</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0 align-top">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.norm}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.risk ? `Nr. ${row.risk.nr} — ${row.risk.bezeichnung}` : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.ctrls.map((c) => c.verfahren).join("; ") || "— keine Kontrolle hinterlegt —"}</td>
                    <td className="px-3 py-2.5"><StatusPill status={row.coverage} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader><CardTitle>Beratung & Schulung</CardTitle></CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Datum</th><th className="px-3 py-2 font-medium">Anlass / Thema</th>
                  <th className="px-3 py-2 font-medium">Adressat</th><th className="px-3 py-2 font-medium">Format</th><th className="px-3 py-2 font-medium">Nachweis</th>
                </tr>
              </thead>
              <tbody>
                {beratung.map((b) => (
                  <tr key={b.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{b.datum}</td>
                    <td className="px-3 py-2.5 text-foreground">{b.thema}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.adressat ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.format ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.nachweis_text ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
