import Link from "next/link";
import { notFound } from "next/navigation";
import { getIncomeStatement, GUV_SECTION_LABELS } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { LineItemsEditor } from "@/components/buchhaltung/line-items-editor";
import { DocumentActions } from "@/components/buchhaltung/document-actions";
import { DocumentFileUpload } from "@/components/buchhaltung/document-file-upload";
import {
  updateIncomeStatementLineItems, finalizeIncomeStatement, reviseIncomeStatement, acknowledgeIncomeStatement,
} from "@/app/(app)/buchhaltung/actions";

const SECTION_OPTIONS = Object.entries(GUV_SECTION_LABELS).map(([value, label]) => ({ value, label }));

export default async function GuvDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, statement] = await Promise.all([getBackendSession(), getIncomeStatement(id).catch(() => null)]);
  if (!statement) notFound();

  const canWrite = session ? canWriteAccounting(session.role) && statement.status === "entwurf" : false;
  const canAcknowledge = session ? isGeschaeftsleitung(session.role) : false;
  const signedOffByMe = session ? statement.signOffs.some((a) => a.userId === session.userId) : false;

  return (
    <div className="space-y-6">
      <Link href="/buchhaltung/guv" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Gewinn- und Verlustrechnung
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{statement.periodLabel ?? `Geschäftsjahr ${statement.fiscalYear}`}</h2>
        <DocumentActions
          status={statement.status}
          signedOffByMe={signedOffByMe}
          canWrite={session ? canWriteAccounting(session.role) : false}
          canAcknowledge={canAcknowledge}
          onFinalize={async () => {
            "use server";
            await finalizeIncomeStatement(id);
          }}
          onRevise={async () => {
            "use server";
            return reviseIncomeStatement(id);
          }}
          onAcknowledge={async () => {
            "use server";
            await acknowledgeIncomeStatement(id);
          }}
          reviseHref={(newId) => `/buchhaltung/guv/${newId}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardBody>
          <LineItemsEditor
            initialItems={statement.lineItems}
            sectionOptions={SECTION_OPTIONS}
            canWrite={canWrite}
            onSave={async (items) => {
              "use server";
              await updateIncomeStatementLineItems(
                id,
                items.map(({ section, label, currentAmount, priorYearAmount, sortOrder }) => ({
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
        basePath={`/accounting/income-statements/${id}`}
        file={statement.file}
        canWrite={session ? canWriteAccounting(session.role) : false}
        title="Signierte GuV (PDF)"
      />
    </div>
  );
}
