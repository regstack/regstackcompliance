// Split out from risikomanagement.ts so Client Components can import these constants without
// pulling in apiFetch (server-only, depends on next/headers) — same fix compliance-utils.ts
// applies for the Compliance module. Never add a value import from risikomanagement.ts here.

export type RisikoartKategorie =
  | "ADRESSENAUSFALLRISIKO"
  | "MARKTPREISRISIKO_HANDELSBUCH"
  | "MARKTPREISRISIKO_ANLAGEBUCH"
  | "LIQUIDITAETSRISIKO"
  | "OPERATIONELLES_RISIKO"
  | "KONZENTRATIONSRISIKO"
  | "ESG_RISIKO"
  | "SONSTIGES_RISIKO";

export const RISIKOART_LABELS: Record<RisikoartKategorie, string> = {
  ADRESSENAUSFALLRISIKO: "Adressenausfallrisiko",
  MARKTPREISRISIKO_HANDELSBUCH: "Marktpreisrisiko Handelsbuch",
  MARKTPREISRISIKO_ANLAGEBUCH: "Marktpreisrisiko Anlagebuch",
  LIQUIDITAETSRISIKO: "Liquiditätsrisiko",
  OPERATIONELLES_RISIKO: "Operationelles Risiko",
  KONZENTRATIONSRISIKO: "Konzentrationsrisiko",
  ESG_RISIKO: "ESG-Risiko",
  SONSTIGES_RISIKO: "Sonstiges Risiko",
};
