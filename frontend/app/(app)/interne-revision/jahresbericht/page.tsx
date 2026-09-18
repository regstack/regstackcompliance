import {
  listReports, listPruefungen, listFeststellungen, listUniversum,
  severityProfile, universeStatus, cycleYears, nextDueDate, today,
  type Risikokriterien,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { JahresberichtPanel } from "@/components/revisions/berichte/jahresbericht-panel";
import type { JahresberichtContent, ResolvedJahrAudit, ResolvedJahrCarryover, ResolvedJahrPlanItem } from "@/app/(app)/interne-revision/jahresbericht/actions";

function asContent(content: unknown): JahresberichtContent {
  return (
    content && typeof content === "object"
      ? content
      : { year: 0, fromDate: "", toDate: "", auditIds: [], carryoverRefs: [], plannedObjectIds: [], planAdherence: "", gesamtaussage: "" }
  ) as JahresberichtContent;
}

export default async function JahresberichtPage() {
  const session = await getBackendSession();
  const [reports, pruefungen, feststellungen, universum] = await Promise.all([
    listReports("jahresbericht"),
    listPruefungen(),
    listFeststellungen(),
    listUniversum(),
  ]);

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const canAck = session ? isGeschaeftsleitung(session.role) : false;

  const resolvedReports = reports.map((r) => {
    const content = asContent(r.content);
    const frozen = r.status === "final";

    let audits: ResolvedJahrAudit[];
    let carryover: ResolvedJahrCarryover[];
    let plan: ResolvedJahrPlanItem[];

    if (frozen && content.resolvedAudits && content.resolvedCarryover && content.resolvedPlan) {
      audits = content.resolvedAudits;
      carryover = content.resolvedCarryover;
      plan = content.resolvedPlan;
    } else {
      audits = content.auditIds
        .map((auditId): ResolvedJahrAudit | null => {
          const p = pruefungen.find((x) => x.id === auditId);
          if (!p) return null;
          const findings = feststellungen
            .filter((f) => f.pruefung_id === auditId)
            .map((f) => ({ id: f.id, titel: f.titel, schweregrad: f.schweregrad, status: f.status }));
          return { id: p.id, subject: p.subject, reportDate: p.report_date ?? "", pruefungsobjektId: p.pruefungsobjekt_id ?? "", findings };
        })
        .filter((a): a is ResolvedJahrAudit => a !== null);

      carryover = content.carryoverRefs
        .map((ref): ResolvedJahrCarryover | null => {
          const f = feststellungen.find((x) => x.id === ref.feststellungId);
          if (!f) return null;
          return {
            feststellungId: f.id,
            pruefungId: ref.pruefungId,
            subject: f.pruefung?.subject ?? f.pruefungsobjekt?.bezeichnung ?? "—",
            titel: f.titel,
            schweregrad: f.schweregrad,
            status: f.status,
          };
        })
        .filter((c): c is ResolvedJahrCarryover => c !== null);

      const auditedObjectIds = new Set(pruefungen.map((p) => p.pruefungsobjekt_id));
      plan = content.plannedObjectIds
        .map((objId): ResolvedJahrPlanItem | null => {
          const u = universum.find((x) => x.id === objId);
          if (!u) return null;
          return { id: u.id, bezeichnung: u.bezeichnung, erledigt: auditedObjectIds.has(u.id) };
        })
        .filter((p): p is ResolvedJahrPlanItem => p !== null);
    }

    const includedFindings = [
      ...audits.flatMap((a) => a.findings),
      ...carryover.map((c) => ({ schweregrad: c.schweregrad, status: c.status })),
    ];
    const profile = severityProfile(includedFindings);

    const fullAudits = audits.map((a) => {
      const p = pruefungen.find((x) => x.id === a.id);
      return { ...a, overallRating: p?.overall_rating ?? null, budgetDays: p?.budget_days ?? 0, actualDays: p?.actual_days ?? 0, durchfuehrung: p?.durchfuehrung ?? "intern" };
    });

    return {
      id: r.id,
      status: r.status,
      period_from: r.period_from,
      period_to: r.period_to,
      created_at: r.created_at,
      kenntnisnahme_at: r.kenntnisnahme_at,
      kenntnisnahme_by: r.kenntnisnahme_by,
      kenntnisnehmer: r.kenntnisnehmer,
      year: content.year,
      planAdherence: content.planAdherence ?? "",
      gesamtaussage: content.gesamtaussage ?? "",
      frozen,
      audits: fullAudits,
      carryover,
      plan,
      profile,
    };
  });

  const thisYear = new Date(today()).getUTCFullYear();
  const coverage = universum.map((u) => {
    const risiko = u.risikokriterien as Risikokriterien | null;
    const status = universeStatus(u.last_audit_date, u.materiality, risiko);
    return {
      id: u.id,
      name: u.bezeichnung,
      outsourced: u.outsourced,
      cycle: cycleYears(u.materiality, risiko),
      next: nextDueDate(u.last_audit_date, u.materiality, risiko),
      status,
    };
  });

  return (
    <div className="space-y-6">
      <Banner title="Zusammenfassende Jahresübersicht">
        Tz. 9 bildet unter AT 4.4.3 nur die mindestens vierteljährliche Berichterstattung ab; eine
        eigenständige Jahresberichtspflicht ist dort nicht geregelt. Der Jahresbericht wird deshalb
        als Verdichtung der bereits erfassten Daten geführt — Plan-Ist, Turnusabdeckung,
        Feststellungsprofil, Altbestände. Ob und in welcher Form die geltende MaRisk-Fassung einen
        eigenständigen Jahresbericht verlangt, ist institutsseitig zu klären.
      </Banner>

      <JahresberichtPanel
        reports={resolvedReports}
        coverage={coverage}
        canWrite={canWrite}
        canAck={canAck}
        defaultYear={thisYear - 1}
        yearOptions={[thisYear - 2, thisYear - 1, thisYear]}
      />
    </div>
  );
}
