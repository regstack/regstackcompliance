import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { BACKEND_TOKEN_COOKIE } from "@/lib/regstack/backend-client";

// Mirrors the Prisma `Role` enum in prisma/schema.prisma — the Express backend's flat,
// one-role-per-user model. This is intentionally NOT the same shape as the Supabase-based
// per-module `internal_role`/`module_type` roles in lib/regstack/session.ts: it now covers all
// three modules (Outsourcing, Compliance, Interne Revision), while Dashboard still bridges both.
export type BackendRole =
  | "GESCHAEFTSLEITUNG"
  | "COMPLIANCE"
  | "RISIKOCONTROLLING"
  | "INTERNE_REVISION"
  | "AUSLAGERUNGSBEAUFTRAGTER"
  | "BUCHHALTUNG"
  | "ADMIN"
  | "VIEWER";

export type BackendSession = {
  userId: string;
  institutionId: string;
  role: BackendRole;
  name: string;
};

/**
 * Decodes and verifies the backend's own JWT (shared JWT_SECRET). Returns null if the cookie is
 * missing, expired, or invalid — e.g. a Supabase-authenticated user with no matching backend
 * account. Real authorization is still enforced by the Express API on every request (rbac.ts);
 * this is only used to drive what the Outsourcing UI shows.
 */
export async function getBackendSession(): Promise<BackendSession | null> {
  const token = (await cookies()).get(BACKEND_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as BackendSession;
  } catch {
    return null;
  }
}

// Mirrors src/middleware/rbac.ts's MATRIX.outsourcingActivity.write — kept in sync manually
// since the UI-side check is only a convenience; the real check runs server-side on every write.
const OUTSOURCING_WRITE_ROLES: BackendRole[] = [
  "COMPLIANCE",
  "RISIKOCONTROLLING",
  "AUSLAGERUNGSBEAUFTRAGTER",
  "ADMIN",
];

export function canWriteOutsourcing(role: BackendRole): boolean {
  return OUTSOURCING_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.contract.write, which is also identical to
// handlungsoption.write and weiterverlagerung.write — deliberately narrower than
// OUTSOURCING_WRITE_ROLES above (excludes RISIKOCONTROLLING: contractual/exit-strategy/
// sub-outsourcing-chain edits are not a risk-controlling task).
const OUTSOURCING_CONTRACT_WRITE_ROLES: BackendRole[] = ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"];

export function canWriteOutsourcingContract(role: BackendRole): boolean {
  return OUTSOURCING_CONTRACT_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.complianceRecord.write.
const COMPLIANCE_WRITE_ROLES: BackendRole[] = ["COMPLIANCE", "ADMIN"];

export function canWriteCompliance(role: BackendRole): boolean {
  return COMPLIANCE_WRITE_ROLES.includes(role);
}

// Every GESCHAEFTSLEITUNG-only backend resource (complianceHandshake.decide,
// complianceReport.acknowledge, revisionReport.acknowledge, revisionPlan.approve,
// handlungsoption.approve, report.approve) also allows ADMIN as an override — mirrored here so
// an Admin isn't shown a "not authorized" UI for something the backend would actually accept.
export function isGeschaeftsleitung(role: BackendRole): boolean {
  return role === "GESCHAEFTSLEITUNG" || role === "ADMIN";
}

// Mirrors src/middleware/rbac.ts's MATRIX.revisionRecord.write (and revisionGovernance.write,
// which uses the same role list).
const REVISION_WRITE_ROLES: BackendRole[] = ["INTERNE_REVISION", "ADMIN"];

export function canWriteRevisions(role: BackendRole): boolean {
  return REVISION_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.accountingRecord.write (and accountingReport.write).
const ACCOUNTING_WRITE_ROLES: BackendRole[] = ["BUCHHALTUNG", "ADMIN"];

export function canWriteAccounting(role: BackendRole): boolean {
  return ACCOUNTING_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.icsControl.write / icsProcess.write.
const ICS_WRITE_ROLES: BackendRole[] = ["RISIKOCONTROLLING", "ADMIN"];

export function canWriteIcs(role: BackendRole): boolean {
  return ICS_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.icsTesting.write — Risikocontrolling and Interne
// Revision both plan/record control tests.
const ICS_TESTING_WRITE_ROLES: BackendRole[] = ["RISIKOCONTROLLING", "INTERNE_REVISION", "ADMIN"];

export function canWriteIcsTesting(role: BackendRole): boolean {
  return ICS_TESTING_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.icsPolicy.write.
const ICS_POLICY_WRITE_ROLES: BackendRole[] = ["RISIKOCONTROLLING", "COMPLIANCE", "ADMIN"];

export function canWriteIcsPolicy(role: BackendRole): boolean {
  return ICS_POLICY_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.ictRegister.write — same role list as
// OUTSOURCING_WRITE_ROLES today, kept as its own constant since the two are conceptually
// independent (DORA ICT risk vs. MaRisk AT 9 outsourcing) and may diverge later.
const ICT_REGISTER_WRITE_ROLES: BackendRole[] = ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"];

export function canWriteIctRegister(role: BackendRole): boolean {
  return ICT_REGISTER_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.riskManagementRecord.write (riskStrategy.write and
// riskManagementReport.write use the same role list). The Geschäftsleitung-only steps —
// Risikostrategie verabschieden, RmReport acknowledge — are covered by isGeschaeftsleitung above,
// same as every other GL-exclusive backend resource.
const RISK_MANAGEMENT_WRITE_ROLES: BackendRole[] = ["RISIKOCONTROLLING", "ADMIN"];

export function canWriteRiskManagement(role: BackendRole): boolean {
  return RISK_MANAGEMENT_WRITE_ROLES.includes(role);
}

// Mirrors src/middleware/rbac.ts's MATRIX.itGovernanceRecord.write (itRiskRecord.write and
// itSecurityIncident.write use the same role list). itStrategy.approve and itRisk.accept are
// Geschäftsleitung-only and covered by isGeschaeftsleitung above.
const IT_RISK_WRITE_ROLES: BackendRole[] = ["RISIKOCONTROLLING", "ADMIN"];

export function canWriteItRisk(role: BackendRole): boolean {
  return IT_RISK_WRITE_ROLES.includes(role);
}
