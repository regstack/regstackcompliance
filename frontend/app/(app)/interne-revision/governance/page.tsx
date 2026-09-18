import {
  getRevisionEinstellungen, listQualitaetssicherung, listProjektbegleitung, listZugriffsvorfaelle,
  listGlMitteilungen, listSonderauftraege, listAllPersons,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { Card, CardBody } from "@/components/ui/card";
import { OrgFormForm } from "@/components/revisions/governance/org-form-form";
import { QsPanel, type QsRow } from "@/components/revisions/governance/qs-panel";
import { ProjektePanel } from "@/components/revisions/governance/projekte-panel";
import { ZugriffsvorfaellePanel } from "@/components/revisions/governance/zugriffsvorfaelle-panel";
import { GlPanel } from "@/components/revisions/governance/gl-panel";

export default async function RevisionGovernancePage() {
  const session = await getBackendSession();
  const [einstellungen, qs, projekte, vorfaelle, mitteilungen, sonderauftraege, personen] = await Promise.all([
    getRevisionEinstellungen(), listQualitaetssicherung(), listProjektbegleitung(), listZugriffsvorfaelle(),
    listGlMitteilungen(), listSonderauftraege(), listAllPersons(),
  ]);

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const canWriteGl = session ? canWriteRevisions(session.role) || isGeschaeftsleitung(session.role) : false;

  const orgForm = einstellungen?.org_form ?? "eigene_einheit";
  const orgFormIssue = orgForm === "geschaeftsleiter" && (!einstellungen?.disproportionality_reason || !einstellungen?.conflict_measures);
  const missingHead = !einstellungen?.head_of_audit_person_id;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Organisation, Unabhängigkeit und Unterstellung der Internen Revision — Tz. 1, 2
      </p>

      {missingHead && (
        <Banner tone="warn" title="Kein Leiter der Internen Revision benannt">
          Erforderlich u. a. für die Eskalation nach Tz. 12 S.1.
        </Banner>
      )}
      {orgFormIssue && (
        <Banner tone="warn" title={'Organisationsform „Geschäftsleiter führt Interne Revision" unvollständig begründet'}>
          Tz. 1 verlangt sowohl eine Unverhältnismäßigkeitsbegründung als auch dokumentierte Maßnahmen zur
          Vermeidung von Interessenkonflikten.
        </Banner>
      )}

      <Card>
        <CardBody>
          <OrgFormForm
            canWrite={canWrite}
            personen={personen}
            initial={{
              org_form: orgForm,
              disproportionality_reason: einstellungen?.disproportionality_reason ?? "",
              conflict_measures: einstellungen?.conflict_measures ?? "",
              head_of_audit_person_id: einstellungen?.head_of_audit_person_id ?? null,
              direct_subordination: einstellungen?.direct_subordination ?? false,
              independence_confirmed: einstellungen?.independence_confirmed ?? false,
            }}
          />
        </CardBody>
      </Card>

      <QsPanel qs={qs as unknown as QsRow[]} canWrite={canWrite} qsIntervallMonate={einstellungen?.qs_intervall_monate ?? 12} />
      <ProjektePanel projekte={projekte} personen={personen} canWrite={canWrite} />
      <ZugriffsvorfaellePanel vorfaelle={vorfaelle} canWrite={canWrite} />
      <GlPanel mitteilungen={mitteilungen} sonderauftraege={sonderauftraege} canWriteGl={canWriteGl} />
    </div>
  );
}
