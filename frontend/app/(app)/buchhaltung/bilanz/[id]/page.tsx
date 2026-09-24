import Link from "next/link";
import { notFound } from "next/navigation";
import { getBalanceSheet, BILANZ_SECTION_LABELS } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { LineItemsEditor } from "@/components/buchhaltung/line-items-editor";
import { DocumentActions } from "@/components/buchhaltung/document-actions";
import { DocumentFileUpload } from "@/components/buchhaltung/document-file-upload";
import {
  updateBalanceSheetLineItems, finalizeBalanceSheet, reviseBalanceSheet, acknowledgeBalanceSheet,
} from "@/app/(app)/buchhaltung/actions";

const SIDE_OPTIONS = [
  { value: "AKTIVA", label: "Aktiva" },
  { value: "PASSIVA", label: "Passiva" },
];
const SECTION_OPTIONS = Object.entries(BILANZ_SECTION_LABELS).map(([value, label]) => ({ value, label }));

export default async function BilanzDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, sheet] = await Promise.all([getBackendSession(), getBalanceSheet(id).catch(() => null)]);
  if (!sheet) notFound();

  const canWrite = session ? canWriteAccounting(session.role) && sheet.status === "entwurf" : false;
  const canAcknowledge = session ? isGeschaeftsleitung(session.role) : false;
  const signedOffByMe = session ? sheet.signOffs.some((a) => a.userId === session.userId) : false;

  return (
    <div className="space-y-6">
      <Link href="/buchhaltung/bilanz" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Bilanz
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{sheet.periodLabel ?? `Geschäftsjahr ${sheet.fiscalYear}`}</h2>
        <DocumentActions
          status={sheet.status}
          signedOffByMe={signedOffByMe}
          canWrite={session ? canWriteAccounting(session.role) : false}
          canAcknowledge={canAcknowledge}
          onFinalize={async () => {
            "use server";
            await finalizeBalanceSheet(id);
          }}
          onRevise={async () => {
            "use server";
            return reviseBalanceSheet(id);
          }}
          onAcknowledge={async () => {
            "use server";
            await acknowledgeBalanceSheet(id);
          }}
          reviseHref={(newId) => `/buchhaltung/bilanz/${newId}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardBody>
          <LineItemsEditor
            initialItems={sheet.lineItems}
            sideOptions={SIDE_OPTIONS}
            sectionOptions={SECTION_OPTIONS}
            canWrite={canWrite}
            onSave={async (items) => {
              "use server";
              await updateBalanceSheetLineItems(
                id,
                items.map(({ side, section, label, currentAmount, priorYearAmount, sortOrder }) => ({
                  side: side!,
                  section,
                  label,
                  currentAmount,
                  priorYearAmount,
                  sortOrder,
                }))
              );
            }}
          />
        </CardBody>
      </Card>

      <DocumentFileUpload
        basePath={`/accounting/balance-sheets/${id}`}
        file={sheet.file}
        canWrite={session ? canWriteAccounting(session.role) : false}
        title="Signierte Bilanz (PDF)"
      />
    </div>
  );
}
