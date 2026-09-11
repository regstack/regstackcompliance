import { describe, expect, it } from "vitest";
import { classify } from "../src/modules/outsourcingActivities/classify";
import { MATERIALITY_CRITERIA_IDS, EXTENSIVE_IMPACT_CRITERIA_IDS, PROVIDER_CRITERIA_IDS } from "../src/modules/outsourcingActivities/criteria";

const cscSettings = {
  calculationModel: "CSC" as const,
  cscMaterialityThreshold: 2.5,
  cscImpactThreshold: 2.75,
  teslaLogicAnd: false,
  teslaThreshold: 3.0,
};

describe("classify — CSC model", () => {
  it("matches the Cloud-Hosting seed example from regstack_cockpit.html", () => {
    const result = classify(
      { m1: 4, m2: 3, m3: 3, m4: 4, m5: 3, m6: 3 },
      { ei1: 3, ei2: 3, ei3: 3, ei4: 3, ei5: 3, ei6: 2 },
      [...MATERIALITY_CRITERIA_IDS],
      [...EXTENSIVE_IMPACT_CRITERIA_IDS],
      {},
      cscSettings
    );
    expect(result.materialityScore).toBeCloseTo(3.33, 1);
    expect(result.secondScore).toBeCloseTo(2.83, 1);
    expect(result.computedMaterial).toBe(true); // both thresholds cleared -> AND-logic material
    expect(result.tier).toBe("Higher");
  });

  it("is NOT material when only one of the two CSC dimensions clears its threshold (AND-logic)", () => {
    const result = classify(
      { m1: 5, m2: 5, m3: 5, m4: 5, m5: 5, m6: 5 }, // materiality clearly high
      { ei1: 1, ei2: 1, ei3: 1, ei4: 1, ei5: 1, ei6: 1 }, // impact clearly low
      [...MATERIALITY_CRITERIA_IDS],
      [...EXTENSIVE_IMPACT_CRITERIA_IDS],
      {},
      cscSettings
    );
    expect(result.computedMaterial).toBe(false);
  });

  it("hard triggers force materiality regardless of scores", () => {
    const result = classify({}, {}, [...MATERIALITY_CRITERIA_IDS], [...EXTENSIVE_IMPACT_CRITERIA_IDS], { t2: true }, cscSettings);
    expect(result.computedMaterial).toBe(true);
    expect(result.criticalSuggestion).toBe(true);
  });
});

describe("classify — Tesla-FS model", () => {
  const teslaSettingsOr = {
    calculationModel: "TESLA" as const,
    cscMaterialityThreshold: 2.5,
    cscImpactThreshold: 2.75,
    teslaLogicAnd: false,
    teslaThreshold: 3.0,
  };

  it("OR-logic: material if EITHER dimension clears the shared threshold (prevents the real SNCI/Adyen under-classification)", () => {
    const result = classify(
      { m1: 1, m2: 1, m3: 1 },
      { p1: 5, p2: 5, p3: 5 },
      ["m1", "m2", "m3"],
      [...PROVIDER_CRITERIA_IDS].slice(0, 3),
      {},
      teslaSettingsOr
    );
    expect(result.computedMaterial).toBe(true);
  });
});
