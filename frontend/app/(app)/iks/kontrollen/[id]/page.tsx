import Link from "next/link";
import { notFound } from "next/navigation";
import { getControl, CONTROL_TYPE_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/regstack/ics";
import { getBackendSession, canWriteIcsTesting } from "@/lib/regstack/backend-session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Kv } from "@/components/ui/kv";
import { TestForm } from "@/components/iks/test-form";
import { TestResultCard } from "@/components/iks/test-result-card";

export default async function KontrolleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, control] = await Promise.all([getBackendSession(), getControl(id).catch(() => null)]);
  if (!control) notFound();

  const canWriteTesting = session ? canWriteIcsTesting(session.role) : false;
  const tests = [...(control.tests ?? [])].sort((a, b) => (b.plannedDate ?? "").localeCompare(a.plannedDate ?? ""));

  return (
    <div className="space-y-6">
      <div>
        {control.businessProcesses?.[0] && (
          <Link href={`/iks/prozesse/${control.businessProcesses[0].id}`} className="text-xs text-muted-foreground hover:text-copper-300">
            ← {control.businessProcesses[0].name}
          </Link>
        )}
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          {control.code && <span className="text-muted-foreground">{control.code} · </span>}
          {control.name}
        </h2>
        {control.description && <p className="mt-1 text-sm text-muted-foreground">{control.description}</p>}
      </div>

      <Card>
        <CardBody className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <Kv k="Kontroll-ID">{control.code ?? "—"}</Kv>
          <Kv k="Kontrolltyp">{CONTROL_TYPE_LABELS[control.controlType]}</Kv>
          <Kv k="Häufigkeit">{CONTROL_FREQUENCY_LABELS[control.frequency]}</Kv>
          <Kv k="Adressierte Risiken">{control.risksAddressed ?? "—"}</Kv>
          <Kv k="Geschäftsprozesse">{control.businessProcesses?.map((p) => p.name).join(", ") || "—"}</Kv>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Kontrolltests</h3>
        {canWriteTesting && <TestForm controlId={id} />}
      </div>

      {tests.length === 0 ? (
        <Card className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">Noch kein Kontrolltest geplant.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <TestResultCard key={t.id} test={t} canWrite={canWriteTesting} />
          ))}
        </div>
      )}

      {(control.policies?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verknüpfte Richtliniendokumente</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {control.policies!.map((p) => (
              <p key={p.id} className="text-sm text-foreground">
                {p.title}
              </p>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
