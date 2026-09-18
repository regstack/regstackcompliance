// Pure validation helpers for the DORA register, kept separate from the route (same rationale as
// weiterverlagerung/tree.ts, revisions/ownership.ts, ...) so the two server-side rules are
// unit-testable without a database:
//   1. a "critical or important function" flag needs a rationale, not just a checkbox
//      (mirrors OutsourcingActivity's scopeJustification-when-scope-deviates rule);
//   2. a DORA arrangement linked to an OutsourcingActivity may only link one whose scope is
//      actually IKT_DORA — the register builds on top of that existing flag, not any Auslagerung.

export function criticalityRationaleMissing(
  criticalOrImportantFunction: boolean | undefined,
  criticalityRationale: string | null | undefined
): boolean {
  return Boolean(criticalOrImportantFunction) && !criticalityRationale;
}

export function isDoraScopedActivity(activity: { scope: string } | null | undefined): boolean {
  return activity?.scope === "IKT_DORA";
}
