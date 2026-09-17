import { listNormen, listFeststellungen, listNormZuweisungHandshakes } from "@/lib/regstack/compliance";
import { Banner } from "@/components/ui/banner";
import { CopyBox } from "@/components/compliance/copy-box";

function toCsv(header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => String(v ?? "—").replaceAll(";", ",");
  return [header.join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
}

function classifyLabel(n: { relevanz: string | null; wesentlichkeit: string | null }) {
  if (n.relevanz === "nicht_relevant") return "geprüft — nicht relevant";
  if (n.wesentlichkeit === "wesentlich") return "wesentlich";
  if (n.wesentlichkeit === "nicht_wesentlich") return "relevant, nicht wesentlich";
  return "Einstufung offen";
}

const FIND_STATUS_LABEL: Record<string, string> = {
  offen: "Offen", fachbereich_erledigt: "Erledigt gemeldet", wirksamkeit_bestaetigt: "Wirksamkeit bestätigt",
  geschlossen: "Geschlossen", akzeptiertes_risiko: "Akzeptiertes Risiko",
};

export default async function ExportPage() {
  const [normen, feststellungen, handshakes] = await Promise.all([listNormen(), listFeststellungen(), listNormZuweisungHandshakes()]);

  const handshakeByNorm = new Map(handshakes.map((h) => [h.entity_id, h.status]));

  const katasterCsv = toCsv(
    ["Regelung", "Sachgebiet", "Einstufung", "Normverantwortlicher", "Zuweisungsstatus", "Personalunion"],
    normen.map((n) => [n.bezeichnung, n.sachgebiet, classifyLabel(n), n.persons?.full_name ?? "—", handshakeByNorm.get(n.id) ?? "—", n.personalunion ? "ja" : "nein"])
  );

  const findingsCsv = toCsv(
    ["Titel", "Regelung", "Schweregrad", "Maßnahme", "Verantwortlich", "Frist", "Status"],
    feststellungen.map((f) => [f.titel, f.normen?.bezeichnung ?? "—", f.schweregrad, f.massnahme, f.verantwortlich?.full_name ?? "—", f.frist, FIND_STATUS_LABEL[f.status] ?? f.status])
  );

  return (
    <div className="space-y-6">
      <Banner title="Prüfungsnachweis auf Knopfdruck">
        Direkt aus dem Kataster und dem Feststellungsregister abgeleitet — dieselbe Feldbasis wie
        in den anderen RegStack-Modulen.
      </Banner>
      <CopyBox title="Export — Rechtsnormenkataster" csv={katasterCsv} />
      <CopyBox title="Export — Feststellungs- und Maßnahmenregister" csv={findingsCsv} />
    </div>
  );
}
