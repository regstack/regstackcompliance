import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUniversumItem, listAllPersons, getRevisionEinstellungen, listPruefungen,
  riskScore, cycleYears, nextDueDate, universeStatus, fmtNum, type Risikokriterien,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { Kv } from "@/components/ui/kv";
import { StatusPill } from "@/components/ui/status-pill";
import { CATEGORY_OPTS } from "@/lib/regstack/revisions-universum";
import { RiskForm } from "@/components/revisions/universum/risk-form";
import { UniversumDetailForm, CreatePruefungCard } from "@/components/revisions/universum/universum-detail-form";

export default async function UniversumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getBackendSession();
  const item = await getUniversumItem(id);
  if (!item) notFound();

  const [personen, einstellungen, pruefungen] = await Promise.all([
    listAllPersons(), getRevisionEinstellungen(), listPruefungen(),
  ]);

  const canWrite = session ? canWriteRevisions(session.role) : false;
  const risk = (item.risikokriterien ?? {}) as Risikokriterien;
  const rationale = (item.risk_rationale ?? {}) as Partial<Record<"potenzial" | "veraenderung" | "quellen" | "manipulation", string>>;
  const score = riskScore(risk);
  const cycle = cycleYears(item.materiality, risk);
  const due = nextDueDate(item.last_audit_date, item.materiality, risk);
  const status = universeStatus(item.last_audit_date, item.materiality, risk);
  const cat = CATEGORY_OPTS.find((c) => c.v === item.category);
  const riskIntervalMonate = einstellungen?.risiko_review_intervall_monate ?? 12;
  const relatedPruefungen = pruefungen.filter((p) => p.pruefungsobjekt_id === id);

  return (
    <div className="space-y-6">
      <Link href="/interne-revision/pruefungsuniversum" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Prüfungsuniversum & Plan
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{item.bezeichnung}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={status} />
            {item.materiality && <StatusPill status={item.materiality} />}
            {item.outsourced && <StatusPill status="in_pruefung" label="ausgelagert" />}
            <StatusPill status={item.status} />
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
          <Kv k="Kategorie">{cat?.label ?? "—"}</Kv>
          <Kv k="Risikoscore">{score === null ? "unvollständig" : fmtNum(score)}</Kv>
          <Kv k="Prüfzyklus">{cycle} Jahre</Kv>
          <Kv k="Letzte Prüfung">{item.last_audit_date ?? "noch nie geprüft"}</Kv>
          <Kv k="Nächste Prüfung fällig">{due}</Kv>
          <Kv k="Verantwortlicher">{item.verantwortlicher?.full_name ?? "—"}</Kv>
        </CardBody>
      </Card>

      <UniversumDetailForm
        universumId={id}
        canWrite={canWrite}
        initialStatus={item.status}
        lastAuditDate={item.last_audit_date}
        initial={{
          bezeichnung: item.bezeichnung, bereich: item.bereich, category: item.category, outsourced: item.outsourced,
          materiality: item.materiality ?? "", reg_anker: item.reg_anker, verantwortlicher_person_id: item.verantwortlicher_person_id,
          plan_year: item.plan_year,
        }}
        personen={personen}
      />

      <RiskForm
        universumId={id}
        initialRisk={risk}
        initialRationale={rationale}
        initialReviewDate={item.risk_review_date}
        initialReviewerId={item.risk_review_reviewer_person_id}
        personen={personen}
        canWrite={canWrite}
        riskIntervalMonate={riskIntervalMonate}
      />

      <CreatePruefungCard universumId={id} defaultSubject={item.bezeichnung} canWrite={canWrite} />

      {relatedPruefungen.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Prüfungen zu diesem Objekt</h3>
            <div className="space-y-1.5">
              {relatedPruefungen.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/interne-revision/pruefungen/${p.id}`} className="text-foreground hover:text-copper-300">
                    {p.subject}
                  </Link>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
