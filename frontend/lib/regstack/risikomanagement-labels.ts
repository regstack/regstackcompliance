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

export type RmStresstestTyp =
  | "sensitivitaetsanalyse"
  | "szenarioanalyse_historisch"
  | "szenarioanalyse_hypothetisch"
  | "schwerer_konjunktureller_abschwung"
  | "inverser_stresstest"
  | "resilienzanalyse";

export const STRESSTEST_TYP_LABELS: Record<RmStresstestTyp, string> = {
  sensitivitaetsanalyse: "Sensitivitätsanalyse",
  szenarioanalyse_historisch: "Szenarioanalyse (historisch)",
  szenarioanalyse_hypothetisch: "Szenarioanalyse (hypothetisch)",
  schwerer_konjunktureller_abschwung: "Schwerer konjunktureller Abschwung",
  inverser_stresstest: "Inverser Stresstest",
  resilienzanalyse: "Resilienzanalyse",
};

export type RmStresstestEbene = "gesamtinstitut" | "risikoart" | "portfolio" | "geschaeftsbereich";

export const STRESSTEST_EBENE_LABELS: Record<RmStresstestEbene, string> = {
  gesamtinstitut: "Gesamtinstitut",
  risikoart: "Risikoart",
  portfolio: "Portfolio",
  geschaeftsbereich: "Geschäftsbereich",
};

export type RmModellKomplexitaet = "einfach" | "komplex";

export const MODELL_KOMPLEXITAET_LABELS: Record<RmModellKomplexitaet, string> = {
  einfach: "Einfach",
  komplex: "Komplex",
};
