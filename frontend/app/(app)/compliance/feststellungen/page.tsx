import { listFeststellungen } from "@/lib/regstack/compliance";
import { getBackendSession, canWriteCompliance } from "@/lib/regstack/backend-session";
import { Banner } from "@/components/ui/banner";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody } from "@/components/ui/card";
import { FeststellungenRegister } from "@/components/compliance/feststellungen-register";

export default async function FeststellungenPage() {
  const session = await getBackendSession();
  const feststellungen = await listFeststellungen();
  const canWrite = session ? canWriteCompliance(session.role) : false;

  const open = feststellungen.filter((f) => f.status !== "geschlossen" && f.status !== "akzeptiertes_risiko").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = feststellungen.filter((f) => f.frist && f.frist < today && f.status !== "geschlossen" && f.status !== "akzeptiertes_risiko").length;
  const accepted = feststellungen.filter((f) => f.status === "akzeptiertes_risiko").length;
  const closed = feststellungen.filter((f) => f.status === "geschlossen").length;

  return (
    <div className="space-y-6">
      <Banner title="Ein zentrales Register, nicht verstreute Einträge">
        Alle Feststellungen der Compliance-Funktion landen in einem Register — Interne Revision,
        Geschäftsleitung und Abschlussprüfer sehen eine einzige, vollständige Liste. Autor ist immer
        die Compliance-Funktion (2nd line); der betroffene Fachbereich kann seine eigene
        Feststellung weder bearbeiten noch schließen.
      </Banner>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Feststellungen gesamt" value={feststellungen.length} />
        <StatCard label="offen / in Bearbeitung" value={open} tone={open ? "warn" : "good"} />
        <StatCard label="überfällig" value={overdue} tone={overdue ? "crit" : "good"} />
        <StatCard label="wirksamkeitsbestätigt geschlossen" value={closed} tone="good" />
      </div>

      <FeststellungenRegister feststellungen={feststellungen} canWrite={canWrite} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Eskalationspfad</h3>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
              <li>Fachbereich setzt die vereinbarte Maßnahme um und meldet &bdquo;erledigt&ldquo; — das allein schließt die Feststellung nicht.</li>
              <li>Compliance prüft den Nachweis und erteilt die Wirksamkeitsbestätigung als eigenen, getrennten Schritt.</li>
              <li>Bei Fristüberschreitung eskaliert die Feststellung: Fachbereich → Compliance → Geschäftsleitung.</li>
              <li>Schwerwiegende Feststellungen lösen eine Ad-hoc-Berichterstattung aus, statt auf den nächsten Quartalsbericht zu warten.</li>
            </ol>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Akzeptiertes Risiko</h3>
            <p className="text-sm text-muted-foreground">
              Ein zulässiger Ausgang — aber nur mit dokumentierter Entscheidung, benanntem
              Entscheider auf angemessener Ebene und Überprüfungstermin.
              {accepted > 0 ? ` Aktuell ${accepted} Feststellung(en) mit diesem Status.` : " Aktuell keine akzeptierten Risiken."}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
