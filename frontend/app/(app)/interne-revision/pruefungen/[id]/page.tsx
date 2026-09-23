import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPruefung, listPruefungZuweisungen, listPruefungsschritte, listArbeitspapiere,
  listArbeitspapiereForPruefung, listAllPersons, listSperrfristen,
  ratingMeta,
} from "@/lib/regstack/revisions";
import { listNachweise, type Nachweis } from "@/lib/regstack/nachweise";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatusPill } from "@/components/ui/status-pill";
import { DetailTabs } from "@/components/outsourcing/detail-tabs";
import { auditCloseBlocked, paperIssues, activeBar, type QsChecklistItem } from "@/lib/regstack/revisions-universum";
import { BerichtTab } from "@/components/revisions/pruefungen/bericht-tab";
import { ProgrammPanel } from "@/components/revisions/pruefungen/programm-panel";
import { QsPanel } from "@/components/revisions/pruefungen/qs-panel";
import type { PaperRow } from "@/components/revisions/pruefungen/paper-card";

export default async function PruefungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getBackendSession();
  const pruefung = await getPruefung(id);
  if (!pruefung) notFound();

  const [assignments, schritte, personen, sperrfristen] = await Promise.all([
    listPruefungZuweisungen(id), listPruefungsschritte(id), listAllPersons(), listSperrfristen(),
  ]);

  const [papersBySchrittList, headerPapers] = await Promise.all([
    Promise.all(schritte.map((s) => listArbeitspapiere(s.id))),
    listArbeitspapiereForPruefung(id),
  ]);

  const papersBySchritt: Record<string, PaperRow[]> = {};
  schritte.forEach((s, i) => {
    papersBySchritt[s.id] = papersBySchrittList[i] as unknown as PaperRow[];
  });
  const allPaperIds = papersBySchrittList.flat().map((p) => p.id);
  // N parallel reads (one per Arbeitspapier) rather than a new batch query in nachweise.ts —
  // matches the existing per-Schritt Promise.all pattern above.
  const nachweiseList = await Promise.all(
    allPaperIds.map((pid) => listNachweise({ module: "INTERNAL_AUDIT", entityType: "arbeitspapier", entityId: pid }))
  );
  const nachweiseByPaper: Record<string, Nachweis[]> = {};
  allPaperIds.forEach((pid, i) => {
    nachweiseByPaper[pid] = nachweiseList[i];
  });

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const rm = ratingMeta(pruefung.overall_rating);
  const issues = paperIssues(headerPapers.map((p) => ({ reviewer_person_id: p.reviewer_person_id, ersteller_person_id: p.ersteller_person_id, review_status: p.review_status })));
  const closeBlocked = auditCloseBlocked(pruefung.status, issues);
  const today = new Date().toISOString().slice(0, 10);
  const conflicts = assignments
    .map((a) => ({ a, bar: activeBar(a.person_id, sperrfristen, today) }))
    .filter((x) => x.bar);

  const qsChecklist = (pruefung.qs_checkliste as QsChecklistItem[] | null) ?? [];

  return (
    <div className="space-y-4">
      <Link href="/interne-revision/pruefungen" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Zurück zur Übersicht
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{pruefung.subject}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {pruefung.pruefungsobjekt?.bezeichnung && <span>{pruefung.pruefungsobjekt.bezeichnung} ·</span>}
          <span>Prüfungszeitraum {pruefung.period_from ?? "–"} – {pruefung.period_to ?? "–"}</span>
          {rm.v ? <StatusPill status={rm.v} label={rm.l} /> : <StatusPill status="offen" label={rm.l} />}
        </div>
      </div>

      {closeBlocked && (
        <Banner tone="warn" title="Prüfung als abgeschlossen markiert, Arbeitspapiere aber nicht vollständig freigegeben">
          {issues.open} von {issues.total} Arbeitspapieren sind offen oder in Nachbesserung. Tz. 10 verlangt nachvollziehbare
          Arbeitsunterlagen — die Nachvollziehbarkeit ist erst mit der Freigabe belegt.
        </Banner>
      )}
      {issues.selfReview > 0 && (
        <Banner tone="crit" title={`${issues.selfReview} Arbeitspapier(e) durch den eigenen Ersteller freigegeben`}>
          Das Vier-Augen-Prinzip ist verletzt: Reviewer und Ersteller sind dieselbe Person.
        </Banner>
      )}
      {conflicts.length > 0 && (
        <Banner tone="crit" title="Prüferzuweisung trotz laufender Sperrfrist">
          Tz. 4 — {conflicts.map(({ a, bar }) => `${a.person?.full_name ?? "—"} (Sperre bis ${bar?.bar_end_date}, Bereich: ${bar?.barred_areas ?? "—"})`).join("; ")}
        </Banner>
      )}

      <DetailTabs
        tabs={[
          {
            key: "bericht",
            label: "Bericht & Gesamturteil",
            content: (
              <BerichtTab
                pruefungId={id}
                berichtInitial={{
                  status: pruefung.status, prepared_by: pruefung.prepared_by, report_date: pruefung.report_date,
                  presented_to: pruefung.presented_to, presented_date: pruefung.presented_date,
                  overall_rating: pruefung.overall_rating, budget_days: pruefung.budget_days ?? 0, actual_days: pruefung.actual_days ?? 0,
                  workpaper_ref: pruefung.workpaper_ref,
                }}
                personen={personen}
                assignments={assignments}
                sperrfristen={sperrfristen}
                durchfuehrung={pruefung.durchfuehrung}
                externDienstleister={pruefung.extern_dienstleister}
                externAblage={pruefung.extern_ablage}
                externEinsicht={pruefung.extern_einsicht}
                canWrite={canWrite}
              />
            ),
          },
          {
            key: "durchfuehrung",
            label: `Arbeitsprogramm & Arbeitspapiere${issues.total ? ` (${issues.total})` : ""}`,
            content: (
              <ProgrammPanel
                pruefungId={id}
                schritte={schritte}
                papersBySchritt={papersBySchritt}
                nachweiseByPaper={nachweiseByPaper}
                uploaderNames={Object.fromEntries(personen.map((p) => [p.id, p.full_name]))}
                personen={personen}
                canWrite={canWrite}
              />
            ),
          },
          {
            key: "qs",
            label: "Qualitätssicherung",
            content: (
              <QsPanel
                pruefungId={id}
                checklist={qsChecklist}
                meta={{
                  qs_completed_by: pruefung.qs_completed_by, qs_completed_at: pruefung.qs_completed_at,
                  qs_reviewed_by: pruefung.qs_reviewed_by, qs_reviewed_at: pruefung.qs_reviewed_at,
                }}
                personen={personen}
                canWrite={canWrite}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
