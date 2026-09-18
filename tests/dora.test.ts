import { describe, expect, it } from "vitest";
import { criticalityRationaleMissing } from "../src/modules/dora/validation";
import { collectRemovalIds } from "../src/modules/weiterverlagerung/tree";

describe("criticalityRationaleMissing — 'kritisch/wichtig' braucht eine Begründung, keine reine Behauptung", () => {
  it("flags a critical-or-important function with no rationale", () => {
    expect(criticalityRationaleMissing(true, undefined)).toBe(true);
    expect(criticalityRationaleMissing(true, null)).toBe(true);
    expect(criticalityRationaleMissing(true, "")).toBe(true);
  });

  it("passes once a rationale is given", () => {
    expect(criticalityRationaleMissing(true, "unterstützt das Kernbankverfahren")).toBe(false);
  });

  it("never requires a rationale when the function is not flagged critical/important", () => {
    expect(criticalityRationaleMissing(false, undefined)).toBe(false);
    expect(criticalityRationaleMissing(undefined, undefined)).toBe(false);
  });
});

describe("collectRemovalIds applied to a DORA sub-outsourcing chain — same generic tree helper as Weiterverlagerung", () => {
  const chain = [
    { id: "root", parentId: null },
    { id: "sub-processor-a", parentId: "root" },
    { id: "sub-processor-b", parentId: "root" },
    { id: "sub-sub-processor", parentId: "sub-processor-a" },
  ];

  it("removing an intermediate node cascades to its descendants only", () => {
    expect(collectRemovalIds("sub-processor-a", chain).sort()).toEqual(
      ["sub-processor-a", "sub-sub-processor"].sort()
    );
  });

  it("removing the root cascades to the whole chain", () => {
    expect(collectRemovalIds("root", chain).sort()).toEqual(
      ["root", "sub-processor-a", "sub-processor-b", "sub-sub-processor"].sort()
    );
  });
});
