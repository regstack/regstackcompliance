// Pure validation/derivation helpers for the BAIT module (IT-Prüfung + Informationsrisikomanagement),
// kept separate from the routes so they're unit-testable without a database — same convention as
// dora/validation.ts, revisions/paper-checks.ts, weiterverlagerung/tree.ts.

import { BaitRisikostufe } from "@prisma/client";

// Eine IT-Prüfung darf nicht als "abgeschlossen" markiert werden, solange sie noch offene oder in
// Bearbeitung befindliche Feststellungen hat — BAIT erwartet, dass Feststellungen bis zur
// tatsächlichen Behebung nachverfolgt werden, nicht nur bis zum formalen Abschluss der Prüfung
// selbst (gleiches Prinzip wie revisions/paper-checks.ts::auditCloseBlocked, nur ohne den
// Vier-Augen-Arbeitspapier-Apparat).
export function openFindingsBlockClosure(findings: { status: string }[]): boolean {
  return findings.some((f) => f.status !== "geschlossen");
}

// Eintrittswahrscheinlichkeit × Auswirkung -> Risikoklasse. Eine explizite 4x4-Matrix statt einer
// Formel, damit jede Kombination nachvollziehbar und einzeln testbar ist (Standard-Risikomatrix,
// ISO-27005-nah: Diagonale bleibt in der jeweiligen Stufe, Extreme in beiden Dimensionen
// eskalieren auf "sehr_hoch").
const RISIKOMATRIX: Record<BaitRisikostufe, Record<BaitRisikostufe, BaitRisikostufe>> = {
  niedrig: { niedrig: "niedrig", mittel: "niedrig", hoch: "mittel", sehr_hoch: "hoch" },
  mittel: { niedrig: "niedrig", mittel: "mittel", hoch: "hoch", sehr_hoch: "sehr_hoch" },
  hoch: { niedrig: "mittel", mittel: "hoch", hoch: "sehr_hoch", sehr_hoch: "sehr_hoch" },
  sehr_hoch: { niedrig: "hoch", mittel: "sehr_hoch", hoch: "sehr_hoch", sehr_hoch: "sehr_hoch" },
};

export function computeRisikoklasse(
  eintrittswahrscheinlichkeit: BaitRisikostufe,
  auswirkung: BaitRisikostufe
): BaitRisikostufe {
  return RISIKOMATRIX[eintrittswahrscheinlichkeit][auswirkung];
}

// Eine Risikoakzeptanz ("Behandlungsoption = akzeptieren") braucht bei hohem/sehr hohem Risiko eine
// nachvollziehbare Begründung, keine reine Checkbox — gleiches Prinzip wie
// dora/validation.ts::criticalityRationaleMissing bzw. RiskAnalysis.overrideReason.
export function akzeptanzBegruendungMissing(
  behandlungsoption: string | null | undefined,
  risikoklasse: BaitRisikostufe | undefined,
  begruendung: string | null | undefined
): boolean {
  const hochesRisiko = risikoklasse === "hoch" || risikoklasse === "sehr_hoch";
  return behandlungsoption === "akzeptieren" && hochesRisiko && !begruendung;
}
