// Pure helper, kept separate from the route so the ownership rule behind "who may report a
// Feststellung's Maßnahme as erledigt" is unit-testable without a database. The Supabase-era
// "Fachbereich" role check was a proxy for this — the real restriction (per its own RLS comment)
// was always "the person responsible for the Prüfungsobjekt this finding belongs to", not a role.
export function canReportMassnahmeErledigt(
  pruefungsobjektVerantwortlichUserId: string | null | undefined,
  userId: string
): boolean {
  return !!pruefungsobjektVerantwortlichUserId && pruefungsobjektVerantwortlichUserId === userId;
}
