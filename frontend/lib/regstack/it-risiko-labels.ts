// Split out from it-risiko.ts so Client Components can import these constants without pulling in
// apiFetch (server-only, depends on next/headers) — same fix as risikomanagement-labels.ts.

export type ItAssetKategorie = "anwendung" | "it_system" | "netzwerk" | "rechenzentrum" | "sonstige";

export const IT_ASSET_KATEGORIE_LABELS: Record<ItAssetKategorie, string> = {
  anwendung: "Anwendung",
  it_system: "IT-System",
  netzwerk: "Netzwerk",
  rechenzentrum: "Rechenzentrum",
  sonstige: "Sonstige",
};
