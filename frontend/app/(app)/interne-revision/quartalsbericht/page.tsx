import {
  listReports, listPruefungen, listFeststellungen, listFristverlaengerungen, getRevisionEinstellungen,
  currentQuarter, effectiveDueDate, findingStage,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { QuartalsberichtPanel } from "@/components/revisions/berichte/quartalsbericht-panel";
import type { QuartalsberichtContent, ResolvedQuartalAudit, ResolvedQuartalCarryover } from "@/app/(app)/interne-revision/quartalsbericht/actions";

function asContent(content: unknown): QuartalsberichtContent {
  return (content && typeof content === "object" ? content : { fromDate: "", toDate: "", auditIds: [], carryoverRefs: [], planAdherence: "" }) as QuartalsberichtContent;
}

export default async function QuartalsberichtPage() {
  const session = await getBackendSession();
  const [reports, pruefungen, feststellungen, einstellungen] = await Promise.all([
    listReports("quartalsbericht"),
    listPruefungen(),
    listFeststellungen(),
    getRevisionEinstellungen(),
  ]);

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const canAck = session ? isGeschaeftsleitung(session.role) : false;
  const angemesseneZeitTage = einstellungen?.angemessene_zeit_tage ?? 90;

  // Tz. 12 S.2 — wesentliche Mängel, bei denen die zuständigen GL-Mitglieder bereits informiert
  // wurden und seither eine Quartalsgrenze verstrichen ist, müssen in den nächsten Bericht.
  const offeneWesentliche = feststellungen.filter((f) => f.status !== "geschlossen" && f.schweregrad !== "geringfuegig");
  const verlaengerungenLists = await Promise.all(offeneWesentliche.map((f) => listFristverlaengerungen(f.id)));
  const gesamtGlDueCount = offeneWesentliche.filter((f, i) => {
    const due = effectiveDueDate(f.frist_urspruenglich, verlaengerungenLists[i]);
    const stage = findingStage(
      { status: f.status, abschluss_art: f.abschluss_art, schweregrad: f.schweregrad, escalation: f.escalation as never, effective_due_date: due },
      angemesseneZeitTage
    );
    return stage === "gesamte_gl_faellig";
  }).length;

  const resolvedReports = reports.map((r) => {
    const content = asContent(r.content);
    const frozen = r.status === "final";

    let audits: ResolvedQuartalAudit[];
    let carryover: ResolvedQuartalCarryover[];

    if (frozen && content.resolvedAudits && content.resolvedCarryover) {
      audits = content.resolvedAudits;
      carryover = content.resolvedCarryover;
    } else {
      audits = content.auditIds
        .map((auditId): ResolvedQuartalAudit | null => {
          const p = pruefungen.find((x) => x.id === auditId);
          if (!p) return null;
          const findings = feststellungen
            .filter((f) => f.pruefung_id === auditId)
            .map((f) => ({ id: f.id, titel: f.titel, schweregrad: f.schweregrad, status: f.status }));
          return { id: p.id, subject: p.subject, reportDate: p.report_date, presentedTo: p.presented_to, findings };
        })
        .filter((a): a is ResolvedQuartalAudit => a !== null);

      carryover = content.carryoverRefs
        .map((ref): ResolvedQuartalCarryover | null => {
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
        .filter((c): c is ResolvedQuartalCarryover => c !== null);
    }

    return {
      id: r.id,
      status: r.status,
      period_from: r.period_from,
      period_to: r.period_to,
      created_at: r.created_at,
      kenntnisnahme_at: r.kenntnisnahme_at,
      kenntnisnahme_by: r.kenntnisnahme_by,
      kenntnisnehmer: r.kenntnisnehmer,
      planAdherence: content.planAdherence ?? "",
      frozen,
      audits,
      carryover,
    };
  });

  const cq = currentQuarter();

  return (
    <div className="space-y-6">
      <Banner title="Mindestens vierteljährlicher Bericht">
        Tz. 9 verlangt eine mindestens vierteljährliche Berichterstattung an die Geschäftsleitung.
        Der Bericht listet jede im Berichtsquartal durchgeführte Prüfung — auch mit null
        Feststellungen, das ist ein valides gutes Ergebnis — sowie alle noch offenen wesentlichen
        Mängel aus anderen Quartalen.
      </Banner>

      {gesamtGlDueCount > 0 && (
        <Banner tone="crit" title={`${gesamtGlDueCount} Feststellung(en) müssen in den nächsten Bericht aufgenommen werden`}>
          Tz. 12 S.2 — die gesamte Geschäftsleitung ist spätestens im nächsten vierteljährlichen
          Bericht über diese weiterhin unbeseitigten wesentlichen Mängel zu informieren.
        </Banner>
      )}

      <QuartalsberichtPanel
        reports={resolvedReports}
        canWrite={canWrite}
        canAck={canAck}
        defaultYear={cq.year}
        defaultQuarter={cq.q}
      />
    </div>
  );
}
