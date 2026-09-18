// Pure validation helper for the DORA register, kept separate from the route (same rationale as
// weiterverlagerung/tree.ts, revisions/ownership.ts, ...) so it's unit-testable without a
// database: a "critical or important function" flag needs a rationale, not just a checkbox
// (mirrors OutsourcingActivity's scopeJustification-when-scope-deviates rule).

export function criticalityRationaleMissing(
  criticalOrImportantFunction: boolean | undefined,
  criticalityRationale: string | null | undefined
): boolean {
  return Boolean(criticalOrImportantFunction) && !criticalityRationale;
}
