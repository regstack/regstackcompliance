// IDs and grouping mirror regstack_cockpit.html exactly (QUICK_TRIGGERS / MATERIALITY_CRITERIA /
// MATERIALITY_DEEP / PROVIDER_CRITERIA / PROVIDER_DEEP / EXTENSIVE_IMPACT_CRITERIA /
// INTEGRATION_FEASIBILITY_ITEMS) so the frontend prototype and this backend never drift apart.

export const QUICK_TRIGGER_IDS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

export const MATERIALITY_CRITERIA_IDS = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;
export const MATERIALITY_DEEP_IDS = [
  "md1", "md2", "md3", "md4", "md5", "md6", "md7", "md8", "md9",
] as const;

export const PROVIDER_CRITERIA_IDS = ["p1", "p2", "p3", "p4", "p5"] as const;
export const PROVIDER_DEEP_IDS = ["pd1", "pd2", "pd3", "pd4", "pd5", "pd6", "pd7"] as const;

export const EXTENSIVE_IMPACT_CRITERIA_IDS = ["ei1", "ei2", "ei3", "ei4", "ei5", "ei6"] as const;

export const INTEGRATION_FEASIBILITY_IDS = [
  "if1", "if2", "if3", "if4", "if5", "if6", "if7",
] as const;

export function materialityIds(deepDive: boolean): string[] {
  return deepDive ? [...MATERIALITY_CRITERIA_IDS, ...MATERIALITY_DEEP_IDS] : [...MATERIALITY_CRITERIA_IDS];
}

export function secondDimensionIds(model: "CSC" | "TESLA", deepDive: boolean): string[] {
  if (model === "CSC") return [...EXTENSIVE_IMPACT_CRITERIA_IDS];
  return deepDive ? [...PROVIDER_CRITERIA_IDS, ...PROVIDER_DEEP_IDS] : [...PROVIDER_CRITERIA_IDS];
}
