import Link from "next/link";
import { listPolicyDocuments, listBusinessProcesses, listControls } from "@/lib/regstack/ics";
import { getBackendSession, canWriteIcsPolicy } from "@/lib/regstack/backend-session";
import { POLICY_SCOPE_LABELS, type PolicyDocumentScope } from "@/lib/regstack/ics-utils";
import { Card, CardBody } from "@/components/ui/card";
import { PolicyForm } from "@/components/iks/policy-form";
import { PolicyScopeSelect } from "@/components/iks/policy-scope-select";

const SCOPE_TABS: { key: PolicyDocumentScope | "all"; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "KUNDENRICHTLINIE", label: POLICY_SCOPE_LABELS.KUNDENRICHTLINIE },
  { key: "SOFTWARE_MARISK_NACHWEIS", label: POLICY_SCOPE_LABELS.SOFTWARE_MARISK_NACHWEIS },
];

export default async function RichtlinienPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope: PolicyDocumentScope | undefined =
    rawScope === "KUNDENRICHTLINIE" || rawScope === "SOFTWARE_MARISK_NACHWEIS" ? rawScope : undefined;

  const [session, policies, processes, controls] = await Promise.all([
    getBackendSession(),
    listPolicyDocuments({ scope }),
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

      <div className="flex flex-wrap gap-2">
        {SCOPE_TABS.map((tab) => {
          const active = (tab.key === "all" && !scope) || tab.key === scope;
          const href = tab.key === "all" ? "/iks/richtlinien" : `/iks/richtlinien?scope=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs ${
                active ? "border-copper-500 bg-copper-700/20 text-copper-300" : "border-border-subtle text-muted-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
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
                  <div className="flex items-center gap-2">
                    {p.documentType && <span className="text-xs text-muted-foreground">{p.documentType}</span>}
                    <PolicyScopeSelect id={p.id} scope={p.scope} canWrite={canWrite} />
                  </div>
                </div>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
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
