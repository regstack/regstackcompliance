import Link from "next/link";
import { listManagementReports } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { CreateDocumentForm } from "@/components/buchhaltung/create-document-form";
import { createManagementReport } from "@/app/(app)/buchhaltung/actions";

export default async function LageberichtListPage() {
  const [session, reports] = await Promise.all([getBackendSession(), listManagementReports()]);
  const canWrite = session ? canWriteAccounting(session.role) : false;
  const sorted = [...reports].sort((a, b) => b.fiscalYear - a.fiscalYear);
  const nextYear = (sorted[0]?.fiscalYear ?? new Date().getFullYear() - 1) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Lagebericht</h2>
        {canWrite && <CreateDocumentForm defaultYear={nextYear} onCreate={createManagementReport} detailHrefBase="/buchhaltung/lagebericht" />}
      </div>

      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch kein Lagebericht erfasst.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <Link key={r.id} href={`/buchhaltung/lagebericht/${r.id}`}>
              <Card className="px-5 py-4">
                <CardBody className="flex items-center justify-between p-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Geschäftsjahr {r.fiscalYear}</p>
                    <p className="text-xs text-muted-foreground">{r.sections.length} Abschnitte</p>
                  </div>
                  <StatusPill status={r.status} />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
