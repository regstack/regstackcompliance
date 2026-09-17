import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistRow } from "@/components/outsourcing/checklist-row";
import { CONTRACT_CHECKLIST_CATALOG } from "@/lib/regstack/contract-checklist-catalog";
import type { ChecklistStatus } from "@/app/(app)/outsourcing/actions";
import type { ContractRecord } from "@/lib/regstack/outsourcing";

const GROUP_LABEL: Record<string, string> = {
  "AT 9 Tz. 6": "Tz. 6 — Handlungsoptionen / Ausstiegsstrategie",
  "AT 9 Tz. 7": "Tz. 7 — Vertragsinhalte (a–n)",
  "AT 9 Tz. 8": "Tz. 8 — Weiterverlagerung",
};

const BACKEND_TO_STATUS: Record<string, ChecklistStatus> = {
  ERFUELLT: "erfuellt",
  NICHT_ERFUELLT: "nicht_erfuellt",
  IN_UEBERARBEITUNG: "in_ueberarbeitung",
};

export function ChecklistPanel({
  auslagerungId,
  contract,
  isSubOutsourcing,
  canWrite,
}: {
  auslagerungId: string;
  contract: ContractRecord | null;
  isSubOutsourcing: boolean;
  canWrite: boolean;
}) {
  const items = CONTRACT_CHECKLIST_CATALOG.filter((item) => isSubOutsourcing || !item.nurBeiWeiterverlagerung);
  const statusFor = (code: string): ChecklistStatus => BACKEND_TO_STATUS[contract?.clauseChecklist[code] ?? "NICHT_ERFUELLT"];
  const offenCount = items.filter((i) => statusFor(i.code) !== "erfuellt").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vertragsprüf-Checkliste (AT 9 Tz. 6–8)</CardTitle>
        <span className="text-xs text-muted-foreground">
          {offenCount === 0 ? "vollständig erfüllt" : `${offenCount} noch nicht erfüllt`}
        </span>
      </CardHeader>

      {(["AT 9 Tz. 6", "AT 9 Tz. 7", "AT 9 Tz. 8"] as const).map((group) => {
        const groupItems = items.filter((i) => i.tzReferenz === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group}>
            <div className="border-b border-border-subtle bg-graphite-900/60 px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {GROUP_LABEL[group] ?? group}
            </div>
            {groupItems.map((item) => (
              <ChecklistRow
                key={item.code}
                auslagerungId={auslagerungId}
                item={item}
                currentStatus={statusFor(item.code)}
                begruendung={contract?.clauseJustifications[item.code] ?? null}
                canWrite={canWrite}
              />
            ))}
          </div>
        );
      })}
    </Card>
  );
}
