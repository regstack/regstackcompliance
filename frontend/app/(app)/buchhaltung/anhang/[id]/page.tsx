import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccountingNotes } from "@/lib/regstack/accounting";
import { getBackendSession, canWriteAccounting, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { SectionsEditor } from "@/components/buchhaltung/sections-editor";
import { DocumentActions } from "@/components/buchhaltung/document-actions";
import { updateAccountingNotesSections, finalizeAccountingNotes, acknowledgeAccountingNotes } from "@/app/(app)/buchhaltung/actions";

export default async function AnhangDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, notes] = await Promise.all([getBackendSession(), getAccountingNotes(id).catch(() => null)]);
  if (!notes) notFound();

  const canWrite = session ? canWriteAccounting(session.role) && notes.status === "entwurf" : false;
  const canAcknowledge = session ? isGeschaeftsleitung(session.role) : false;
  const signedOffByMe = session ? notes.signOffs.some((a) => a.userId === session.userId) : false;

  return (
    <div className="space-y-6">
      <Link href="/buchhaltung/anhang" className="text-xs text-muted-foreground hover:text-copper-300">
        ← Anhang
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Anhang — Geschäftsjahr {notes.fiscalYear}</h2>
        <DocumentActions
          status={notes.status}
          signedOffByMe={signedOffByMe}
          canWrite={session ? canWriteAccounting(session.role) : false}
          canAcknowledge={canAcknowledge}
          onFinalize={async () => {
            "use server";
            await finalizeAccountingNotes(id);
          }}
          onAcknowledge={async () => {
            "use server";
            await acknowledgeAccountingNotes(id);
          }}
          reviseHref={() => "/buchhaltung/anhang"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abschnitte</CardTitle>
        </CardHeader>
        <CardBody>
          <SectionsEditor
            initialSections={notes.sections}
            canWrite={canWrite}
            showLinkedLineItem
            onSave={async (sections) => {
              "use server";
              await updateAccountingNotesSections(id, sections);
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
