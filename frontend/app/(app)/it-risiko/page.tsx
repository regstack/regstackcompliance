import {
  listItStrategien,
  listItAssets,
  listItRisiken,
  listItSicherheitsvorfaelle,
  listItBerechtigungen,
  listItProjekte,
  listItAenderungen,
  listItBetriebsstoerungen,
  listItNotfallplaene,
} from "@/lib/regstack/it-risiko";
import { getBackendSession, canWriteItRisk, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { accessGrantBanner } from "@/components/access-grants/access-gate";
import { StatCard } from "@/components/ui/stat-card";
import { ItStrategiePanel } from "@/components/it-risiko/strategie-panel";
import { AssetPanel } from "@/components/it-risiko/asset-panel";
import { RisikoPanel } from "@/components/it-risiko/risiko-panel";
import { VorfallPanel } from "@/components/it-risiko/vorfall-panel";
import { BerechtigungPanel } from "@/components/it-risiko/berechtigung-panel";
import { ProjektPanel } from "@/components/it-risiko/projekt-panel";
import { AenderungPanel } from "@/components/it-risiko/aenderung-panel";
import { BetriebsstoerungPanel } from "@/components/it-risiko/betriebsstoerung-panel";
import { NotfallplanPanel } from "@/components/it-risiko/notfallplan-panel";

// Plain helper, not the page component itself — keeps the impure Date.now() call out of the
// component body (react-hooks/purity), same reasoning as compliance-utils.ts's isOverdue().
function isWithinLast30Days(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export default async function ItRisikoPage() {
  const session = await getBackendSession();
  if (!session) return null; // layout.tsx already renders the "nicht verknüpft" state

  const gateBanner = await accessGrantBanner(session.role, "IT_RISIKO");
  if (gateBanner) return gateBanner;

  const [strategien, assets, risiken, vorfaelle, berechtigungen, projekte, aenderungen, betriebsstoerungen, notfallplaene] = await Promise.all([
    listItStrategien(),
    listItAssets(),
    listItRisiken(),
    listItSicherheitsvorfaelle(),
    listItBerechtigungen(),
    listItProjekte(),
    listItAenderungen(),
    listItBetriebsstoerungen(),
    listItNotfallplaene(),
  ]);

  const canWrite = canWriteItRisk(session.role);
  const canApprove = isGeschaeftsleitung(session.role);

  const aktuelleStrategie = strategien[0] ?? null;
  const hoheSchutzbedarfAssets = assets.filter(
    (a) => a.schutzbedarfVertraulichkeit === "sehr_hoch" || a.schutzbedarfIntegritaet === "sehr_hoch" || a.schutzbedarfVerfuegbarkeit === "sehr_hoch"
      || a.schutzbedarfVertraulichkeit === "hoch" || a.schutzbedarfIntegritaet === "hoch" || a.schutzbedarfVerfuegbarkeit === "hoch"
  ).length;
  const offeneRisiken = risiken.filter((r) => r.status === "offen" || r.status === "in_bearbeitung").length;
  const hoheRestrisiken = risiken.filter((r) => r.restrisiko === "hoch" && r.status !== "akzeptiert_von_gl" && r.status !== "geschlossen").length;
  const vorfaelle30Tage = vorfaelle.filter((v) => isWithinLast30Days(v.datum));
  const meldepflichtig30Tage = vorfaelle30Tage.filter((v) => v.meldepflichtBaFin).length;

  const faelligeRezertifizierungen = berechtigungen.filter(
    (b) => b.status === "aktiv" && b.naechsteRezertifizierung && isWithinLast30Days(b.naechsteRezertifizierung)
  ).length;
  const laufendeProjekte = projekte.filter((p) => p.status === "laufend").length;
  const offeneAenderungen = aenderungen.filter((a) => a.status === "beantragt" || a.status === "genehmigt").length;
  const offeneStoerungen = betriebsstoerungen.filter((s) => s.status !== "geschlossen").length;
  const notfallplaeneOhneTest = notfallplaene.filter((p) => p.status === "freigegeben" && !p.letzterTestAm).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="IT-Strategie"
          value={aktuelleStrategie ? (aktuelleStrategie.status === "verabschiedet" ? "Verabschiedet" : "Entwurf") : "—"}
          hint={aktuelleStrategie?.naechsteUeberpruefung ? `Nächste Überprüfung ${aktuelleStrategie.naechsteUeberpruefung.slice(0, 10)}` : "noch keine Strategie"}
          tone={aktuelleStrategie?.status === "verabschiedet" ? "good" : "neutral"}
        />
        <StatCard label="Schutzbedarf hoch / sehr hoch" value={hoheSchutzbedarfAssets} hint={`von ${assets.length} erfassten IT-Assets`} />
        <StatCard
          label="Offene IT-Risiken"
          value={offeneRisiken}
          hint={hoheRestrisiken ? `davon ${hoheRestrisiken} mit Restrisiko hoch, GL-Akzeptanz ausstehend` : "kein offenes hohes Restrisiko"}
          tone={hoheRestrisiken ? "warn" : "good"}
        />
        <StatCard
          label="Sicherheitsvorfälle (30 Tage)"
          value={vorfaelle30Tage.length}
          hint={meldepflichtig30Tage ? `davon ${meldepflichtig30Tage} BaFin-meldepflichtig` : "keine Meldepflicht ausgelöst"}
          tone={meldepflichtig30Tage ? "crit" : vorfaelle30Tage.length ? "warn" : "good"}
        />
        <StatCard
          label="Rezertifizierung fällig (30 Tage)"
          value={faelligeRezertifizierungen}
          hint={`von ${berechtigungen.length} aktiven Berechtigungen`}
          tone={faelligeRezertifizierungen ? "warn" : "good"}
        />
        <StatCard label="Laufende IT-Projekte" value={laufendeProjekte} hint={`von ${projekte.length} erfassten Projekten`} />
        <StatCard
          label="Offene Änderungen"
          value={offeneAenderungen}
          hint={`${offeneStoerungen} offene Betriebsstörung${offeneStoerungen === 1 ? "" : "en"}`}
          tone={offeneStoerungen ? "warn" : "neutral"}
        />
        <StatCard
          label="Notfallpläne ohne Test"
          value={notfallplaeneOhneTest}
          hint={`von ${notfallplaene.length} Notfallplänen`}
          tone={notfallplaeneOhneTest ? "warn" : "good"}
        />
      </div>

      <ItStrategiePanel items={strategien} canWrite={canWrite} canApprove={canApprove} />
      <AssetPanel items={assets} canWrite={canWrite} />
      <RisikoPanel items={risiken} assets={assets} canWrite={canWrite} canAccept={canApprove} />
      <VorfallPanel items={vorfaelle} canWrite={canWrite} />
      <BerechtigungPanel items={berechtigungen} assets={assets} canWrite={canWrite} />
      <ProjektPanel items={projekte} canWrite={canWrite} />
      <AenderungPanel items={aenderungen} assets={assets} canWrite={canWrite} />
      <BetriebsstoerungPanel items={betriebsstoerungen} canWrite={canWrite} />
      <NotfallplanPanel items={notfallplaene} assets={assets} canWrite={canWrite} />
    </div>
  );
}
