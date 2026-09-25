import Link from "next/link";
import { listPolicyDocuments, listBusinessProcesses, listControls } from "@/lib/regstack/ics";
import { getBackendSession, canWriteIcsPolicy } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { PolicyForm, PolicyEditButton } from "@/components/iks/policy-form";
import { PolicyDownloadButton } from "@/components/iks/policy-download-button";

export default async function RichtlinienPage() {
  const [session, policies, processes, controls] = await Promise.all([
    getBackendSession(),
    listPolicyDocuments(),
    listBusinessProcesses(),
    listControls(),
  ]);
  const canWrite = session ? canWriteIcsPolicy(session.role) : false;

  return (
    <div className="space-y-6">
      <Link href="/iks" className="text-xs text-muted-foreground hover:text-copper-300">
        ← IKS-Übersicht
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Richtlinien- &amp; Workflow-Dokumente</h2>
        {canWrite && (
          <PolicyForm
            businessProcessOptions={processes.map((p) => ({ id: p.id, name: p.name }))}
            controlOptions={controls.map((c) => ({ id: c.id, name: c.name }))}
          />
        )}
      </div>

      {policies.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Dokumente hinterlegt.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <Card key={p.id} className="px-5 py-4">
              <CardBody className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <div className="flex items-center gap-3">
                    {p.documentType && <span className="text-xs text-muted-foreground">{p.documentType}</span>}
                    {canWrite && (
                      <PolicyEditButton
                        policy={p}
                        businessProcessOptions={processes.map((bp) => ({ id: bp.id, name: bp.name }))}
                        controlOptions={controls.map((c) => ({ id: c.id, name: c.name }))}
                      />
                    )}
                  </div>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                {p.fileName && (
                  <div className="mt-2">
                    <PolicyDownloadButton policyId={p.id} fileName={p.fileName} />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.businessProcesses?.map((bp) => (
                    <Link
                      key={bp.id}
                      href={`/iks/prozesse/${bp.id}`}
                      className="rounded-full bg-graphite-800 px-2 py-0.5 text-[11px] text-graphite-300 hover:text-copper-300"
                    >
                      {bp.name}
                    </Link>
                  ))}
                  {p.controls?.map((c) => (
                    <Link
                      key={c.id}
                      href={`/iks/kontrollen/${c.id}`}
                      className="rounded-full bg-graphite-800 px-2 py-0.5 text-[11px] text-graphite-300 hover:text-copper-300"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
