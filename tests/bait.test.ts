import { describe, expect, it } from "vitest";
import { openFindingsBlockClosure, computeRisikoklasse, akzeptanzBegruendungMissing } from "../src/modules/bait/validation";

describe("openFindingsBlockClosure — eine IT-Prüfung kann nicht mit unerledigten Feststellungen abgeschlossen werden", () => {
  it("blocks closure when a finding is still offen or in_bearbeitung", () => {
    expect(openFindingsBlockClosure([{ status: "offen" }])).toBe(true);
    expect(openFindingsBlockClosure([{ status: "in_bearbeitung" }])).toBe(true);
    expect(openFindingsBlockClosure([{ status: "geschlossen" }, { status: "offen" }])).toBe(true);
  });

  it("allows closure once every finding is geschlossen, or there are none", () => {
    expect(openFindingsBlockClosure([{ status: "geschlossen" }, { status: "geschlossen" }])).toBe(false);
    expect(openFindingsBlockClosure([])).toBe(false);
  });
});

describe("computeRisikoklasse — Eintrittswahrscheinlichkeit x Auswirkung -> Risikoklasse", () => {
  it("keeps the diagonal (both dimensions equal) at the same level", () => {
    expect(computeRisikoklasse("niedrig", "niedrig")).toBe("niedrig");
    expect(computeRisikoklasse("mittel", "mittel")).toBe("mittel");
    expect(computeRisikoklasse("hoch", "hoch")).toBe("sehr_hoch");
    expect(computeRisikoklasse("sehr_hoch", "sehr_hoch")).toBe("sehr_hoch");
  });

  it("is symmetric — likelihood and impact are interchangeable", () => {
    expect(computeRisikoklasse("niedrig", "hoch")).toBe(computeRisikoklasse("hoch", "niedrig"));
    expect(computeRisikoklasse("mittel", "sehr_hoch")).toBe(computeRisikoklasse("sehr_hoch", "mittel"));
  });

  it("escalates a low likelihood but very high impact above the lower dimension", () => {
    expect(computeRisikoklasse("niedrig", "sehr_hoch")).toBe("hoch");
  });

  it("matches the documented matrix for a mixed low/high combination", () => {
    expect(computeRisikoklasse("niedrig", "mittel")).toBe("niedrig");
    expect(computeRisikoklasse("mittel", "hoch")).toBe("hoch");
  });
});

describe("akzeptanzBegruendungMissing — Risikoakzeptanz braucht bei hohem Risiko eine Begründung", () => {
  it("flags acceptance of a hoch/sehr_hoch risk with no rationale", () => {
    expect(akzeptanzBegruendungMissing("akzeptieren", "hoch", undefined)).toBe(true);
    expect(akzeptanzBegruendungMissing("akzeptieren", "sehr_hoch", null)).toBe(true);
    expect(akzeptanzBegruendungMissing("akzeptieren", "hoch", "")).toBe(true);
  });

  it("passes once a rationale is given", () => {
    expect(akzeptanzBegruendungMissing("akzeptieren", "hoch", "Kompensationskontrolle etabliert, Restrisiko tragbar")).toBe(false);
  });

  it("never requires a rationale for a niedrig/mittel risk, even when accepted", () => {
    expect(akzeptanzBegruendungMissing("akzeptieren", "niedrig", undefined)).toBe(false);
    expect(akzeptanzBegruendungMissing("akzeptieren", "mittel", undefined)).toBe(false);
  });

  it("never requires a rationale for a treatment option other than acceptance", () => {
    expect(akzeptanzBegruendungMissing("mindern", "sehr_hoch", undefined)).toBe(false);
    expect(akzeptanzBegruendungMissing(undefined, "sehr_hoch", undefined)).toBe(false);
  });
});
