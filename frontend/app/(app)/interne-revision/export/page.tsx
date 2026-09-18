import {
  listUniversum, listPruefungen, listFeststellungen, listReports, listQualitaetssicherung,
  listFristverlaengerungen, getRevisionEinstellungen,
  universeStatus, cycleYears, nextDueDate, riskScore, fmtNum, ratingMeta, severityLabel, findingStage,
  SEVERITY_ORDER, STAGE_LABEL, UNIV_STATUS_LABEL, today,
  type Escalation, type Risikokriterien, type SeveritySettings,
} from "@/lib/regstack/revisions";
import { Banner } from "@/components/ui/banner";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { CopyBox } from "@/components/compliance/copy-box";

const ORG_FORM_LABEL: Record<string, string> = {
  eigene_einheit: "Eigene Revisionseinheit",
  geschaeftsleiter: "Aufgabenwahrnehmung durch einen Geschäftsleiter",
};

export default async function RevisionExportPage() {
  const [universum, pruefungen, feststellungen, reports, qsHistory, einstellungen] = await Promise.all([
    listUniversum(), listPruefungen(), listFeststellungen(), listReports(), listQualitaetssicherung(), getRevisionEinstellungen(),
  ]);

  const angemesseneZeitTage = einstellungen?.angemessene_zeit_tage ?? 90;
  const severitySettings = (einstellungen?.severity_settings as SeveritySettings | null) ?? null;

  const univ = universum.map((u) => ({
    ...u,
    status: universeStatus(u.last_audit_date, u.materiality, u.risikokriterien as Risikokriterien),
    cycle: cycleYears(u.materiality, u.risikokriterien as Risikokriterien),
    nextDue: nextDueDate(u.last_audit_date, u.materiality, u.risikokriterien as Risikokriterien),
    riskScoreVal: riskScore(u.risikokriterien as Risikokriterien),
  }));

  const completedAudits = pruefungen
    .filter((a) => a.status === "abgeschlossen")
    .slice()
    .sort((a, b) => ((b.report_date || "") < (a.report_date || "") ? -1 : 1));

  const openFindingsRaw = feststellungen.filter((f) => f.status !== "geschlossen");
  const openFindings = (
    await Promise.all(
      openFindingsRaw.map(async (f) => {
        const verlaengerungen = await listFristverlaengerungen(f.id);
        const effectiveDueDate = verlaengerungen.length ? verlaengerungen[verlaengerungen.length - 1].neu : f.frist_urspruenglich;
        const stage = findingStage(
          { status: f.status, abschluss_art: f.abschluss_art, schweregrad: f.schweregrad, escalation: f.escalation as Escalation, effective_due_date: effectiveDueDate },
          angemesseneZeitTage
        );
        return { ...f, effectiveDueDate, stage };
      })
    )
  ).sort((a, b) => SEVERITY_ORDER.indexOf((a.schweregrad ?? "wesentlich") as (typeof SEVERITY_ORDER)[number]) - SEVERITY_ORDER.indexOf((b.schweregrad ?? "wesentlich") as (typeof SEVERITY_ORDER)[number]));

  const quartalsberichte = reports.filter((r) => r.report_type === "quartalsbericht");
  const jahresberichte = reports.filter((r) => r.report_type === "jahresbericht");

  const orgFormLabel = ORG_FORM_LABEL[einstellungen?.org_form ?? "eigene_einheit"] ?? einstellungen?.org_form ?? "—";

  const lines: string[] = [];
  lines.push("REVISIONS-COCKPIT — EXPORT FÜR WIRTSCHAFTSPRÜFER:INNEN");
  lines.push(`Stand ${today()}`);
  lines.push("");
  lines.push("-- GOVERNANCE-BASISDATEN --");
  lines.push(`Organisationsform: ${orgFormLabel}`);
  lines.push(`Leiter/in Interne Revision: ${einstellungen?.head_of_audit?.full_name ?? "— nicht benannt"}`);
  lines.push(`Direkt der Geschäftsleitung unterstellt: ${einstellungen?.direct_subordination ? "ja" : "nein"}`);
  lines.push(`Unabhängigkeit bestätigt: ${einstellungen?.independence_confirmed ? "ja" : "nein"}`);
  lines.push("");
  lines.push(`-- PRÜFUNGSUNIVERSUM, ABDECKUNG (${univ.length}) --`);
  univ.forEach((u) => {
    lines.push(
      `${u.bezeichnung} | ${u.materiality === "wesentlich" ? "wesentlich" : "nicht wesentlich"} | Risikoscore ${fmtNum(u.riskScoreVal)} | Zyklus ${u.cycle} J. | nächste Prüfung ${u.nextDue} | ${UNIV_STATUS_LABEL[u.status]}`
    );
  });
  lines.push("");
  lines.push(`-- ABGESCHLOSSENE PRÜFUNGEN (${completedAudits.length}) --`);
  completedAudits.forEach((a) => {
    const rm = ratingMeta(a.overall_rating);
    lines.push(`${a.subject} | Bericht ${a.report_date || "–"} | Gesamturteil ${rm.l} | vorgelegt an ${a.presented_to || "–"}`);
  });
  lines.push("");
  lines.push(`-- OFFENE FESTSTELLUNGEN (${openFindings.length}) --`);
  openFindings.forEach((f) => {
    lines.push(`${f.pruefung?.subject ?? f.pruefungsobjekt?.bezeichnung ?? "—"} | ${f.titel} | ${severityLabel(f.schweregrad, severitySettings)} | ${STAGE_LABEL[f.stage]} | Frist ${f.effectiveDueDate || "–"}`);
  });
  lines.push("");
  lines.push("-- BERICHTSFREIGABEN --");
  if (!quartalsberichte.length && !jahresberichte.length) lines.push("Noch kein Bericht erfasst.");
  quartalsberichte.forEach((r) => lines.push(`Quartalsbericht ${r.period_from ?? "–"}–${r.period_to ?? "–"} | ${r.status === "final" ? `genehmigt${r.kenntnisnehmer?.full_name ? ` durch ${r.kenntnisnehmer.full_name}` : ""} am ${r.kenntnisnahme_at ?? "–"}` : "Entwurf"}`));
  jahresberichte.forEach((r) => lines.push(`Jahresbericht ${r.period_from ?? "–"}–${r.period_to ?? "–"} | ${r.status === "final" ? `genehmigt${r.kenntnisnehmer?.full_name ? ` durch ${r.kenntnisnehmer.full_name}` : ""} am ${r.kenntnisnahme_at ?? "–"}` : "Entwurf"}`));
  lines.push("");
  lines.push("-- ÜBERPRÜFUNG VON PLANUNG, METHODEN UND QUALITÄT (Tz. 1 S.2) --");
  if (!qsHistory.length) lines.push("Keine Überprüfung dokumentiert.");
  qsHistory.forEach((q) => {
    const scope = (q.scope as { planung?: boolean; methoden?: boolean; qualitaet?: boolean } | null) ?? {};
    const scopeTxt = [["planung", "Planung"], ["methoden", "Methoden"], ["qualitaet", "Qualität"]]
      .filter(([k]) => scope[k as "planung" | "methoden" | "qualitaet"])
      .map(([, l]) => l)
      .join(", ") || "—";
    lines.push(`${q.date} | ${q.type === "regelmaessig" ? "regelmäßig" : "anlassbezogen"} | Gegenstand: ${scopeTxt} | durchgeführt durch ${q.reviewer || "–"} | nächste Fälligkeit ${q.next_due || "–"}`);
  });
  const summaryText = lines.join("\n");

  return (
    <div className="space-y-6">
      <Banner title="Kontrollierter Prüferzugang">
        Rollenbasierter, ausschließlich lesender, befristeter Export für Abschlussprüfer,
        Aufsichtsbehörden oder Sonderprüfer — Umfang und Freigabe legt das Institut fest. Diese Ansicht
        konsolidiert den aktuellen Stand aus den übrigen Bereichen des Cockpits und ist selbst nicht
        bearbeitbar — Änderungen erfolgen ausschließlich im jeweiligen Fachbereich.
      </Banner>

      <Card>
        <CardHeader><CardTitle>Governance-Basisdaten</CardTitle></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border-subtle"><td className="px-2 py-2 text-muted-foreground">Organisationsform</td><td className="px-2 py-2 text-foreground">{orgFormLabel}</td></tr>
              <tr className="border-b border-border-subtle"><td className="px-2 py-2 text-muted-foreground">Leiter/in der Internen Revision</td><td className="px-2 py-2 text-foreground">{einstellungen?.head_of_audit?.full_name ?? "nicht benannt"}</td></tr>
              <tr className="border-b border-border-subtle"><td className="px-2 py-2 text-muted-foreground">Direkt der Geschäftsleitung unterstellt</td><td className="px-2 py-2 text-foreground">{einstellungen?.direct_subordination ? "ja" : "nein"}</td></tr>
              <tr><td className="px-2 py-2 text-muted-foreground">Unabhängigkeit bestätigt</td><td className="px-2 py-2 text-foreground">{einstellungen?.independence_confirmed ? "ja" : "nein"}</td></tr>
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prüfungsuniversum — Abdeckung</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Objekt</th><th className="px-2 py-2 font-medium">Wesentlichkeit</th>
                <th className="px-2 py-2 font-medium">Risikoscore</th><th className="px-2 py-2 font-medium">Zyklus</th>
                <th className="px-2 py-2 font-medium">Nächste Prüfung</th><th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {univ.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-2 py-2 text-foreground">{u.bezeichnung}{u.outsourced ? " (ausgelagert)" : ""}</td>
                  <td className="px-2 py-2 text-muted-foreground">{u.materiality === "wesentlich" ? "wesentlich" : "nicht wesentlich"}</td>
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{fmtNum(u.riskScoreVal)}</td>
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{u.cycle} J.</td>
                  <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{u.nextDue}</td>
                  <td className="px-2 py-2 text-muted-foreground">{UNIV_STATUS_LABEL[u.status]}</td>
                </tr>
              ))}
              {univ.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">Kein Prüfungsobjekt erfasst.</td></tr>}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Abgeschlossene Prüfungen</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          {completedAudits.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Prüfungsgegenstand</th><th className="px-2 py-2 font-medium">Berichtsdatum</th>
                  <th className="px-2 py-2 font-medium">Gesamturteil</th><th className="px-2 py-2 font-medium">Vorgelegt an</th>
                </tr>
              </thead>
              <tbody>
                {completedAudits.map((a) => (
                  <tr key={a.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2 text-foreground">{a.subject}{a.durchfuehrung === "ausgelagert" ? " (ausgelagert)" : ""}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{a.report_date || "–"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{ratingMeta(a.overall_rating).l}</td>
                    <td className="px-2 py-2 text-muted-foreground">{a.presented_to || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Keine abgeschlossene Prüfung im Bestand.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Offene Feststellungen</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          {openFindings.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Prüfung</th><th className="px-2 py-2 font-medium">Feststellung</th>
                  <th className="px-2 py-2 font-medium">Schweregrad</th><th className="px-2 py-2 font-medium">Stand</th><th className="px-2 py-2 font-medium">Frist</th>
                </tr>
              </thead>
              <tbody>
                {openFindings.map((f) => (
                  <tr key={f.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2 text-foreground">{f.pruefung?.subject ?? f.pruefungsobjekt?.bezeichnung ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{f.titel}</td>
                    <td className="px-2 py-2 text-muted-foreground">{severityLabel(f.schweregrad, severitySettings)}</td>
                    <td className="px-2 py-2 text-muted-foreground">{STAGE_LABEL[f.stage]}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{f.effectiveDueDate || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Keine offene Feststellung.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Berichtsfreigaben</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          {(quartalsberichte.length || jahresberichte.length) ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Bericht</th><th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Kenntnisnahme durch</th><th className="px-2 py-2 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {[...quartalsberichte, ...jahresberichte].map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-2 py-2 text-foreground">{r.report_type === "quartalsbericht" ? "Quartalsbericht" : "Jahresbericht"} {r.period_from ?? "–"}–{r.period_to ?? "–"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.status === "final" ? "genehmigt" : "Entwurf"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.kenntnisnehmer?.full_name ?? "–"}</td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{r.kenntnisnahme_at ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Noch kein Bericht erfasst.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Überprüfung von Planung, Methoden und Qualität</CardTitle></CardHeader>
        <CardBody className="space-y-4 overflow-x-auto">
          {qsHistory.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Datum</th><th className="px-2 py-2 font-medium">Art</th>
                  <th className="px-2 py-2 font-medium">Gegenstand</th><th className="px-2 py-2 font-medium">Durchgeführt durch</th><th className="px-2 py-2 font-medium">Nächste Fälligkeit</th>
                </tr>
              </thead>
              <tbody>
                {qsHistory.map((q) => {
                  const scope = (q.scope as { planung?: boolean; methoden?: boolean; qualitaet?: boolean } | null) ?? {};
                  const scopeTxt = [["planung", "Planung"], ["methoden", "Methoden"], ["qualitaet", "Qualität"]]
                    .filter(([k]) => scope[k as "planung" | "methoden" | "qualitaet"]).map(([, l]) => l).join(", ") || "—";
                  return (
                    <tr key={q.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{q.date}</td>
                      <td className="px-2 py-2 text-muted-foreground">{q.type === "regelmaessig" ? "regelmäßig" : "anlassbezogen"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{scopeTxt}</td>
                      <td className="px-2 py-2 text-muted-foreground">{q.reviewer || "–"}</td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{q.next_due || "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Keine Überprüfung dokumentiert.</p>}
          <CopyBox title="Textexport (zum Kopieren)" csv={summaryText} />
        </CardBody>
      </Card>
    </div>
  );
}
