import {
  listFeststellungen, listFristverlaengerungen, listPruefungen, listAllPersons,
  getRevisionEinstellungen, effectiveDueDate, findingStage,
  type SeveritySettings,
} from "@/lib/regstack/revisions";
import { getBackendSession, canWriteRevisions } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { FeststellungenRegister } from "@/components/revisions/feststellungen/feststellungen-register";

export default async function FeststellungenPage() {
  const session = await getBackendSession();
  const [feststellungen, pruefungen, personen, einstellungen] = await Promise.all([
    listFeststellungen(),
    listPruefungen(),
    listAllPersons(),
    getRevisionEinstellungen(),
  ]);

  // Fristverlängerungen sind pro Feststellung ein eigener, append-only Datensatz (Fristenhistorie) —
  // hier einmalig gebündelt geladen, damit weder die Statuskarten noch die Registerzeilen selbst
  // N+1-Anfragen auslösen.
  const verlaengerungenLists = await Promise.all(feststellungen.map((f) => listFristverlaengerungen(f.id)));
  const verlaengerungenByFeststellung = new Map(feststellungen.map((f, i) => [f.id, verlaengerungenLists[i]]));

  const angemesseneZeitTage = einstellungen?.angemessene_zeit_tage ?? 90;
  const severitySettings = (einstellungen?.severity_settings ?? null) as SeveritySettings | null;

  const withStage = feststellungen.map((f) => {
    const verlaengerungen = verlaengerungenByFeststellung.get(f.id) ?? [];
    const effectiveDue = effectiveDueDate(f.frist_urspruenglich, verlaengerungen);
    const stage = findingStage(
      { status: f.status, abschluss_art: f.abschluss_art, schweregrad: f.schweregrad, escalation: f.escalation as never, effective_due_date: effectiveDue },
      angemesseneZeitTage
    );
    return { f, verlaengerungen, effectiveDue, stage };
  });

  const canWrite = session ? canWriteRevisions(session.role) : false;

  const total = feststellungen.length;
  const open = feststellungen.filter((f) => f.status !== "geschlossen").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = withStage.filter((x) => x.f.status !== "geschlossen" && x.effectiveDue && x.effectiveDue < today).length;
  const eskalationFaellig = withStage.filter((x) => x.stage === "eskalation_faellig" || x.stage === "gesamte_gl_faellig").length;
  const wesentlich = feststellungen.filter((f) => f.schweregrad === "besonders_schwerwiegend" || f.schweregrad === "schwerwiegend").length;

  return (
    <div className="space-y-6">
      <Banner title="Ein zentrales Register über alle Prüfungen hinweg">
        Jede Feststellung entsteht innerhalb einer konkreten Prüfung — das Register verdichtet sie
        prüfungsübergreifend zu einer einzigen Nachverfolgung mit Fristenhistorie, Stellungnahme,
        Abschluss und den Eskalationsstufen nach Tz. 8, 11 und 12.
      </Banner>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Feststellungen gesamt" value={total} />
        <StatCard label="offen / in Bearbeitung" value={open} tone={open ? "warn" : "good"} />
        <StatCard label="überfällig" value={overdue} tone={overdue ? "crit" : "good"} />
        <StatCard label="Eskalation fällig (Tz. 12)" value={eskalationFaellig} tone={eskalationFaellig ? "crit" : "good"} />
      </div>

      <FeststellungenRegister
        rows={withStage.map((x) => ({
          ...x.f,
          verlaengerungen: x.verlaengerungen,
          effectiveDue: x.effectiveDue,
          stage: x.stage,
        }))}
        pruefungen={pruefungen}
        personen={personen}
        severitySettings={severitySettings}
        canWrite={canWrite}
        currentUserId={session?.userId ?? ""}
      />

      <p className="text-xs text-muted-foreground">
        {wesentlich > 0
          ? `${wesentlich} Feststellung(en) mit Schweregrad schwerwiegend/besonders schwerwiegend — bei Richtung gegen einen Geschäftsleiter greift die Meldepflicht nach Tz. 8.`
          : "Keine Feststellungen mit Schweregrad schwerwiegend/besonders schwerwiegend."}
      </p>
    </div>
  );
}
