import { BerichtForm } from "@/components/revisions/pruefungen/bericht-form";
import { ZuweisungenPanel, type Zuweisung } from "@/components/revisions/pruefungen/zuweisungen-panel";
import { DurchfuehrungPanel } from "@/components/revisions/pruefungen/durchfuehrung-panel";
import type { BerichtInput } from "@/app/(app)/interne-revision/pruefungen/actions";
import type { Sperrfrist } from "@/lib/regstack/revisions-universum";

export function BerichtTab({
  pruefungId, berichtInitial, personen, assignments, sperrfristen, durchfuehrung, externDienstleister, externAblage, externEinsicht, canWrite,
}: {
  pruefungId: string;
  berichtInitial: BerichtInput;
  personen: { id: string; full_name: string }[];
  assignments: Zuweisung[];
  sperrfristen: Sperrfrist[];
  durchfuehrung: string;
  externDienstleister: string | null;
  externAblage: string | null;
  externEinsicht: unknown;
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      <BerichtForm pruefungId={pruefungId} initial={berichtInitial} personen={personen} canWrite={canWrite} />
      <ZuweisungenPanel pruefungId={pruefungId} assignments={assignments} personen={personen} sperrfristen={sperrfristen} canWrite={canWrite} />
      <DurchfuehrungPanel
        pruefungId={pruefungId}
        durchfuehrung={durchfuehrung}
        externDienstleister={externDienstleister}
        externAblage={externAblage}
        externEinsicht={externEinsicht}
        canWrite={canWrite}
      />
    </div>
  );
}
