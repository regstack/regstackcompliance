import { listNachweise } from "@/lib/regstack/compliance";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

const LEVEL_LABEL: Record<string, string> = {
  kontrolle: "Kontrolle", kontrolldurchfuehrung: "Kontrolldurchführung", feststellung: "Feststellung",
};

export default async function NachweisePage() {
  const nachweise = await listNachweise();

  return (
    <div className="space-y-6">
      <Banner title="Nachweise auf drei Ebenen">
        Dokumente lassen sich an der Kontrolle (Design-Nachweis), an der einzelnen
        Kontrolldurchführung (Betriebs-Nachweis) und an der Feststellung
        (Remediation-Nachweis) hinterlegen.
      </Banner>
      <Banner tone="warn" title="Unveränderlich, sobald verknüpft">
        Kein stilles Überschreiben: neue Fassungen werden zusätzlich abgelegt, die Vorversion
        bleibt sichtbar und erhalten. Je Datei wird ein Hash-Wert geführt, um die Integrität
        nachzuweisen.
      </Banner>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Dokument</th>
                <th className="px-3 py-2 font-medium">Ebene</th>
                <th className="px-3 py-2 font-medium">Fassung</th>
                <th className="px-3 py-2 font-medium">Hochgeladen von / am</th>
                <th className="px-3 py-2 font-medium">Hash</th>
                <th className="px-3 py-2 font-medium">Aufbewahrung</th>
              </tr>
            </thead>
            <tbody>
              {nachweise.map((n) => (
                <tr key={n.id} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-3 py-2.5 font-medium text-foreground">{n.dateiname}</td>
                  <td className="px-3 py-2.5"><StatusPill status="open" label={LEVEL_LABEL[n.entity_type] ?? n.entity_type} /></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{n.previous_version_id ? "Folgeversion" : "v1"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {n.uploader?.full_name ?? "—"}
                    <div className="font-mono text-xs">{n.uploaded_at?.slice(0, 10)}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{n.hash ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{n.aufbewahrungsfrist ?? "unbefristet"}</td>
                </tr>
              ))}
              {nachweise.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Noch keine Nachweise hinterlegt.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
