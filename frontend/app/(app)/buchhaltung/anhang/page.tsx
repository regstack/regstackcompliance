import Link from "next/link";
import { listAccountingNotes } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { CreateDocumentForm } from "@/components/buchhaltung/create-document-form";
import { createAccountingNotes } from "@/app/(app)/buchhaltung/actions";

export default async function AnhangListPage() {
  const [session, notes] = await Promise.all([getBackendSession(), listAccountingNotes()]);
  const canWrite = session ? canWriteAccounting(session.role) : false;
  const sorted = [...notes].sort((a, b) => b.fiscalYear - a.fiscalYear);
  const nextYear = (sorted[0]?.fiscalYear ?? new Date().getFullYear() - 1) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Anhang</h2>
        {canWrite && <CreateDocumentForm defaultYear={nextYear} onCreate={createAccountingNotes} detailHrefBase="/buchhaltung/anhang" />}
      </div>

      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch kein Anhang erfasst.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((n) => (
            <Link key={n.id} href={`/buchhaltung/anhang/${n.id}`}>
              <Card className="px-5 py-4">
                <CardBody className="flex items-center justify-between p-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Geschäftsjahr {n.fiscalYear}</p>
                    <p className="text-xs text-muted-foreground">{n.sections.length} Abschnitte</p>
                  </div>
                  <StatusPill status={n.status} />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
