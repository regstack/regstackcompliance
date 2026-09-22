import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessProcess } from "@/lib/regstack/ics";
import { getBackendSession, canWriteIcs } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { Kv } from "@/components/ui/kv";
import { ControlForm } from "@/components/iks/control-form";
import { CONTROL_TYPE_LABELS, CONTROL_FREQUENCY_LABELS } from "@/lib/regstack/ics";

export default async function ProzessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, process] = await Promise.all([getBackendSession(), getBusinessProcess(id).catch(() => null)]);
  if (!process) notFound();

  const canWrite = session ? canWriteIcs(session.role) : false;

  return (
    <div className="space-y-6">
      <Link href="/iks" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Geschäftsprozesse
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{process.name}</h2>
        {process.description && <p className="mt-1 text-sm text-muted-foreground">{process.description}</p>}
      </div>

      <Card>
        <CardBody className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <Kv k="Owner / Abteilung">{process.owner ?? "—"}</Kv>
          <Kv k="Kontrollen">{process.controls?.length ?? 0}</Kv>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">Kontrollen</h3>
        {canWrite && <ControlForm businessProcessId={id} />}
      </div>

      {(process.controls?.length ?? 0) === 0 ? (
        <Card className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Kontrollen mit diesem Prozess verknüpft.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {process.controls!.map((c) => (
            <Link key={c.id} href={`/iks/kontrollen/${c.id}`}>
              <Card className="px-5 py-4">
                <CardBody className="flex flex-wrap items-center justify-between gap-2 p-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {c.code && <span className="text-muted-foreground">{c.code} · </span>}
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {CONTROL_TYPE_LABELS[c.controlType]} · {CONTROL_FREQUENCY_LABELS[c.frequency]}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {(process.policies?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-foreground">Verknüpfte Richtliniendokumente</h3>
          <div className="space-y-2">
            {process.policies!.map((p) => (
              <Card key={p.id} className="px-4 py-3">
                <p className="text-sm text-foreground">{p.title}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
