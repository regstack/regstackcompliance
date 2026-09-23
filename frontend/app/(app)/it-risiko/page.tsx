import { listItStrategien, listItAssets, listItRisiken, listItSicherheitsvorfaelle } from "@/lib/regstack/it-risiko";
import { getBackendSession, canWriteItRisk, isGeschaeftsleitung } from "@/lib/regstack/backend-session";
import { StatCard } from "@/components/ui/stat-card";
import { ItStrategiePanel } from "@/components/it-risiko/strategie-panel";
import { AssetPanel } from "@/components/it-risiko/asset-panel";
import { RisikoPanel } from "@/components/it-risiko/risiko-panel";
import { VorfallPanel } from "@/components/it-risiko/vorfall-panel";

// Plain helper, not the page component itself — keeps the impure Date.now() call out of the
// component body (react-hooks/purity), same reasoning as compliance-utils.ts's isOverdue().
function isWithinLast30Days(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export default async function ItRisikoPage() {
  const session = await getBackendSession();
  if (!session) return null; // layout.tsx already renders the "nicht verknüpft" state

  const [strategien, assets, risiken, vorfaelle] = await Promise.all([
    listItStrategien(),
    listItAssets(),
    listItRisiken(),
    listItSicherheitsvorfaelle(),
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
      </div>

      <ItStrategiePanel items={strategien} canWrite={canWrite} canApprove={canApprove} />
      <AssetPanel items={assets} canWrite={canWrite} />
      <RisikoPanel items={risiken} assets={assets} canWrite={canWrite} canAccept={canApprove} />
      <VorfallPanel items={vorfaelle} canWrite={canWrite} />
    </div>
  );
}
