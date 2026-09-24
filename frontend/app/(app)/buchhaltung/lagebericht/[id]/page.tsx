import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagementReport } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { SectionsEditor } from "@/components/buchhaltung/sections-editor";
import { DocumentActions } from "@/components/buchhaltung/document-actions";
import { DocumentFileUpload } from "@/components/buchhaltung/document-file-upload";
import { updateManagementReportSections, finalizeManagementReport, acknowledgeManagementReport } from "@/app/(app)/buchhaltung/actions";

export default async function LageberichtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, report] = await Promise.all([getBackendSession(), getManagementReport(id).catch(() => null)]);
  if (!report) notFound();

  const canWrite = session ? canWriteAccounting(session.role) && report.status === "entwurf" : false;
  const canAcknowledge = session ? isGeschaeftsleitung(session.role) : false;
  const signedOffByMe = session ? report.signOffs.some((a) => a.userId === session.userId) : false;

  return (
    <div className="space-y-6">
      <Link href="/buchhaltung/lagebericht" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Lagebericht
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Lagebericht — Geschäftsjahr {report.fiscalYear}</h2>
        <DocumentActions
          status={report.status}
          signedOffByMe={signedOffByMe}
          canWrite={session ? canWriteAccounting(session.role) : false}
          canAcknowledge={canAcknowledge}
          onFinalize={async () => {
            "use server";
            await finalizeManagementReport(id);
          }}
          onAcknowledge={async () => {
            "use server";
            await acknowledgeManagementReport(id);
          }}
          reviseHref={() => "/buchhaltung/lagebericht"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abschnitte</CardTitle>
        </CardHeader>
        <CardBody>
          <SectionsEditor
            initialSections={report.sections}
            canWrite={canWrite}
            onSave={async (sections) => {
              "use server";
              await updateManagementReportSections(id, sections);
            }}
          />
        </CardBody>
      </Card>

      <DocumentFileUpload
        basePath={`/accounting/management-reports/${id}`}
        file={report.file}
        canWrite={session ? canWriteAccounting(session.role) : false}
        title="Signierter Lagebericht (PDF)"
      />
    </div>
  );
}
