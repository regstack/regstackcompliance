import Link from "next/link";
import { listBalanceSheets } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting } from "@/lib/regstack/backend-session";
import { Card, CardBody } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { CreateDocumentForm } from "@/components/buchhaltung/create-document-form";
import { createBalanceSheet } from "@/app/(app)/buchhaltung/actions";

export default async function BilanzListPage() {
  const [session, sheets] = await Promise.all([getBackendSession(), listBalanceSheets()]);
  const canWrite = session ? canWriteAccounting(session.role) : false;
  const sorted = [...sheets].sort((a, b) => b.fiscalYear - a.fiscalYear);
  const nextYear = (sorted[0]?.fiscalYear ?? new Date().getFullYear() - 1) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Bilanz</h2>
        {canWrite && <CreateDocumentForm defaultYear={nextYear} onCreate={createBalanceSheet} detailHrefBase="/buchhaltung/bilanz" />}
      </div>

      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Bilanz erfasst.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((s) => (
            <Link key={s.id} href={`/buchhaltung/bilanz/${s.id}`}>
              <Card className="px-5 py-4">
                <CardBody className="flex items-center justify-between p-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.periodLabel ?? `Geschäftsjahr ${s.fiscalYear}`}</p>
                    <p className="text-xs text-muted-foreground">{s.lineItems.length} Positionen</p>
                  </div>
                  <StatusPill status={s.status} />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
