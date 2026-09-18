// Pure helper, kept separate from the route so the ownership rule behind "who may respond to a
// Normzuweisung-Handshake" is unit-testable without a database. Deliberately NOT a role check:
// the Supabase-era "Fachbereich" concept was ownership (whoever the norm was proposed to), not a
// Backend Role — see Phase 2 plan.
export function canRespondToHandshake(handshake: { assignedUserId: string; status: string }, userId: string): boolean {
  return handshake.status === "vorschlag" && handshake.assignedUserId === userId;
}
