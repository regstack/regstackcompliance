"use client";

import { useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { paperIssues } from "@/lib/regstack/revisions-universum";
import { SchrittCard, type SchrittRow } from "@/components/revisions/pruefungen/schritt-card";
import type { PaperRow } from "@/components/revisions/pruefungen/paper-card";
import { addSchritt } from "@/app/(app)/interne-revision/pruefungen/actions";

export function ProgrammPanel({
  pruefungId, schritte, papersBySchritt, nachweiseByPaper, personen, canWrite,
}: {
  pruefungId: string;
  schritte: SchrittRow[];
  papersBySchritt: Record<string, PaperRow[]>;
  nachweiseByPaper: Record<string, { id: string; dateiname: string; hash: string | null; uploaded_at: string; uploader: { full_name: string } | null }[]>;
  personen: { id: string; full_name: string }[];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const allPapers = Object.values(papersBySchritt).flat();
  const issues = paperIssues(allPapers.map((p) => ({ reviewer_person_id: p.reviewer_person_id, ersteller_person_id: p.ersteller_person_id, review_status: p.review_status })));

  function addStep() {
    const nextNummer = schritte.length ? Math.max(...schritte.map((s) => s.nummer)) + 1 : 1;
    startTransition(async () => {
      await addSchritt(pruefungId, nextNummer);
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Arbeitsprogramm</CardTitle></CardHeader>
      <CardBody>
        <p className="mb-4 text-xs text-muted-foreground">
          Tz. 10 — nachvollziehbare Arbeitsunterlagen. Maßstab ist die Wiederholbarkeit: eine unabhängige Person muss
          dieselben Schritte nachvollziehen und zum selben Ergebnis kommen können. Dafür trägt jeder Prüfungsschritt das
          geprüfte Risiko, die Soll-Aussage, die Prüfungshandlung und das Ergebnis.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Prüfungsschritte" value={schritte.length} hint="im Arbeitsprogramm" />
          <StatCard label="Arbeitspapiere" value={issues.total} />
          <StatCard label="Nicht freigegeben" value={issues.open} tone={issues.open ? "warn" : "good"} hint="offen oder in Nachbesserung" />
          <StatCard label="Vier-Augen verletzt" value={issues.selfReview} tone={issues.selfReview ? "crit" : "good"} hint="Reviewer = Ersteller" />
        </div>

        {schritte.length === 0 ? (
          <div className="rounded-md border border-border-subtle bg-graphite-900/60 px-3 py-2 text-xs text-muted-foreground">
            Noch kein Arbeitsprogramm angelegt.
          </div>
        ) : (
          schritte.map((s) => (
            <SchrittCard
              key={s.id}
              schritt={s}
              pruefungId={pruefungId}
              papers={papersBySchritt[s.id] ?? []}
              nachweiseByPaper={nachweiseByPaper}
              personen={personen}
              canWrite={canWrite}
            />
          ))
        )}

        {canWrite && <Button className="mt-3 px-2.5 py-1.5 text-xs" disabled={pending} onClick={addStep}>+ Prüfungsschritt</Button>}
      </CardBody>
    </Card>
  );
}
