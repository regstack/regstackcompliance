import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

// Illustrative mock of the real Auslagerungsregister screen (see
// app/(app)/outsourcing/page.tsx for the live version) — same columns,
// same StatusPill component and status values, fictional example rows.
// Not a live screenshot: that page sits behind login.
const ROWS = [
  {
    name: "Rechenzentrum-Hosting",
    category: "IT-Betrieb",
    provider: "CloudTec GmbH",
    materiality: "wesentlich" as const,
    status: "aktiv",
  },
  {
    name: "Kartenzahlungsabwicklung",
    category: "Zahlungsverkehr",
    provider: "PaySecure AG",
    materiality: "wesentlich" as const,
    status: "in_pruefung",
  },
  {
    name: "Dokumentenarchivierung",
    category: "Backoffice",
    provider: "ArchivPro GmbH",
    materiality: "nicht_wesentlich" as const,
    status: "aktiv",
  },
  {
    name: "Kundenservice-Callcenter",
    category: "Vertrieb",
    provider: "ServicePartner KG",
    materiality: "wesentlich" as const,
    status: "entwurf",
  },
];

export function RegisterPreview() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-card">
      {/* Browser-style chrome to frame this as a product shot, not a live table */}
      <div className="flex items-center gap-3 border-b border-border-subtle bg-surface-raised px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-graphite-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-graphite-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-graphite-600" />
        </div>
        <span className="mx-auto rounded-full bg-graphite-800 px-4 py-1 text-xs text-muted-foreground">
          app.regstack.de/outsourcing
        </span>
      </div>

      <div className="p-6 text-left sm:p-8">
        <div className="mb-5">
          <h3 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Auslagerungsregister
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            AT 9 — alle Auslagerungen Ihrer Institution.
          </p>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium sm:px-5">Bezeichnung</th>
                <th className="hidden px-5 py-2.5 font-medium sm:table-cell">Anbieter</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Wesentlichkeit</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.category}</div>
                  </td>
                  <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                    {row.provider}
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <StatusPill status={row.materiality} />
                  </td>
                  <td className="px-4 py-3 sm:px-5">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <p className="mt-4 text-xs text-muted-foreground">
          Beispielhafte Ansicht mit fiktiven Daten.
        </p>
      </div>
    </div>
  );
}
