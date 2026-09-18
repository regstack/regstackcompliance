"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABEL, severityLabel, type FindingStage, type SeveritySettings } from "@/lib/regstack/revisions-utils";
import { FeststellungDetail, type FeststellungDetailData } from "@/components/revisions/feststellungen/feststellung-detail";
import { FeststellungForm } from "@/components/revisions/feststellungen/feststellung-form";

type FeststellungRow = FeststellungDetailData & {
  titel: string;
  beschreibung: string | null;
  stage: FindingStage;
  pruefungsobjekt: { bezeichnung: string; verantwortlicher_person_id?: string | null } | null;
  pruefung: { subject: string } | null;
  verantwortlich: { full_name: string } | null;
};

type Pruefung = { id: string; subject: string; pruefungsobjekt: { bezeichnung: string } | null };
type Person = { id: string; full_name: string };

const FILTERS: { key: string; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "offen", label: "Offen" },
  { key: "massnahme_erledigt", label: "Erledigt gemeldet" },
  { key: "eskalation", label: "Eskalation fällig" },
  { key: "geschlossen", label: "Geschlossen" },
];

function matchesFilter(filter: string, r: FeststellungRow) {
  if (filter === "alle") return true;
  if (filter === "eskalation") return r.stage === "eskalation_faellig" || r.stage === "gesamte_gl_faellig";
  return r.status === filter;
}

function Row({
  r, canWrite, currentUserId, severitySettings,
}: {
  r: FeststellungRow;
  canWrite: boolean;
  currentUserId: string;
  severitySettings: SeveritySettings | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const stage = r.stage as FindingStage;
  // Ownership, not role — mirrors the backend's real gate (canReportMassnahmeErledigt): whoever
  // is responsible for this finding's Prüfungsobjekt may report the Maßnahme as erledigt.
  const isFachbereich = !!r.pruefungsobjekt?.verantwortlicher_person_id && r.pruefungsobjekt.verantwortlicher_person_id === currentUserId;

  return (
    <>
      <tr className="cursor-pointer border-b border-border-subtle align-top hover:bg-graphite-900/40" onClick={() => setExpanded((e) => !e)}>
        <td className="px-3 py-2.5">
          <div className="font-medium text-foreground">{r.titel}</div>
          {r.pruefung && <div className="text-xs text-muted-foreground">{r.pruefung.subject}</div>}
          {!r.pruefung && r.pruefungsobjekt && <div className="text-xs text-muted-foreground">{r.pruefungsobjekt.bezeichnung}</div>}
        </td>
        <td className="px-3 py-2.5">{r.schweregrad && <StatusPill status={r.schweregrad} label={severityLabel(r.schweregrad, severitySettings)} />}</td>
        <td className="px-3 py-2.5">
          <span className="font-mono text-xs text-muted-foreground">{r.effectiveDue ?? "—"}</span>
          {(r.verlaengerungen ?? []).length > 0 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">{r.verlaengerungen.length}× verlängert</div>
          )}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{r.verantwortlich?.full_name ?? "—"}</td>
        <td className="px-3 py-2.5"><StatusPill status={stage} label={STAGE_LABEL[stage]} /></td>
        <td className="px-3 py-2.5 text-right">
          <span className="text-xs text-copper-300">{expanded ? "einklappen ▲" : "Details ▼"}</span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <FeststellungDetail f={r} canWrite={canWrite} isFachbereich={isFachbereich} />
          </td>
        </tr>
      )}
    </>
  );
}

export function FeststellungenRegister({
  rows, pruefungen, personen, severitySettings, canWrite, currentUserId,
}: {
  rows: FeststellungRow[];
  pruefungen: Pruefung[];
  personen: Person[];
  severitySettings: SeveritySettings | null;
  canWrite: boolean;
  currentUserId: string;
}) {
  const [filter, setFilter] = useState("alle");
  const [adding, setAdding] = useState(false);
  const filtered = rows.filter((r) => matchesFilter(filter, r));

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  filter === f.key
                    ? "border-copper-500 bg-copper-500/10 text-copper-300"
                    : "border-border-strong text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {canWrite && !adding && (
            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>
              + Neue Feststellung
            </Button>
          )}
        </div>

        {adding && (
          <div className="mb-4">
            <FeststellungForm pruefungen={pruefungen} personen={personen} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Feststellung / Prüfung</th>
                <th className="px-3 py-2 font-medium">Schweregrad</th>
                <th className="px-3 py-2 font-medium">Frist</th>
                <th className="px-3 py-2 font-medium">Verantwortlich</th>
                <th className="px-3 py-2 font-medium">Nachverfolgungsstand</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <Row key={r.id} r={r} canWrite={canWrite} currentUserId={currentUserId} severitySettings={severitySettings} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Keine Feststellungen in diesem Filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
