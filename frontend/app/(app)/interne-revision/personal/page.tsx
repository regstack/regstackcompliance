import {
  listRevisionPersonal, listRevisionSchulungen, listSperrfristen, listSonderwissen, listAllPersons, listPruefungen,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { PersonalPanel } from "@/components/revisions/personal/personal-panel";
import { QualifikationPanel } from "@/components/revisions/personal/qualifikation-panel";
import { SperrfristenPanel } from "@/components/revisions/personal/sperrfristen-panel";
import { SonderwissenPanel } from "@/components/revisions/personal/sonderwissen-panel";

export default async function RevisionPersonalPage() {
  const session = await getBackendSession();
  const [personal, schulungen, sperrfristen, sonderwissen, allPersons, pruefungen] = await Promise.all([
    listRevisionPersonal(), listRevisionSchulungen(), listSperrfristen(), listSonderwissen(), listAllPersons(), listPruefungen(),
  ]);
  const canWrite = session ? canWriteRevisions(session.role) : false;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Revisionsfremde Aufgaben, beratende Tätigkeit, Wechsel aus anderen Einheiten — Tz. 3, 4
      </p>

      <PersonalPanel personal={personal} allPersons={allPersons} canWrite={canWrite} />
      <QualifikationPanel personal={personal} schulungen={schulungen} canWrite={canWrite} />
      <SperrfristenPanel sperrfristen={sperrfristen} personen={allPersons} canWrite={canWrite} />
      <SonderwissenPanel
        sonderwissen={sonderwissen}
        personen={allPersons}
        pruefungen={pruefungen.map((p) => ({ id: p.id, subject: p.subject }))}
        canWrite={canWrite}
      />
    </div>
  );
}
