// Pure helpers, kept separate from the routes so the two gates below are unit-testable without a
// database. Both mirror pure frontend helpers (paperSelfReview/auditCloseBlocked in
// revisions-universum.ts) that existed only as advisory UI warnings — nothing stopped saving a
// self-reviewed paper or closing an audit with open papers from the old Supabase-backed frontend.
// This is where that changes: these become real, server-enforced gates.

export function isSelfReview(reviewerUserId: string | null | undefined, erstellerUserId: string | null | undefined): boolean {
  return !!(reviewerUserId && erstellerUserId && reviewerUserId === erstellerUserId);
}

export type PaperForCloseCheck = { reviewStatus: string; reviewerUserId: string | null; erstellerUserId: string | null };

/** A Prüfung can't be marked "abgeschlossen" while any of its Arbeitspapiere are still open
 * (not "freigegeben") or were self-reviewed — Tz. 10: closed-but-unresolved is a claim, not a
 * demonstrated fact. */
export function auditCloseBlocked(papers: PaperForCloseCheck[]): boolean {
  return papers.some((p) => p.reviewStatus !== "freigegeben" || isSelfReview(p.reviewerUserId, p.erstellerUserId));
}
