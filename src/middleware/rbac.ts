import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ForbiddenError } from "../utils/errors";

export type Resource =
  | "institution"
  | "outsourcingActivity"
  | "riskAnalysis"
  | "contract"
  | "handlungsoption"
  | "handlungsoption.approve" // Dependency-Acceptance-Genehmigung, Geschäftsleitung only
  | "monitoring"
  | "weiterverlagerung"
  | "report"
  | "report.approve"
  | "auditLog"
  | "user"
  | "complianceRecord" // Quellen, Änderungen, Normen, Feststellungen, Ratings
  | "complianceHandshake.decide" // Geschäftsleitung entscheidet einen widersprochenen Normzuweisungs-Handshake
  | "complianceGovernance" // Tz. 3-4 Governance-Einstellungen (Singleton)
  | "complianceReport"
  | "complianceReport.acknowledge" // Geschäftsleitung-Kenntnisnahme eines finalen Berichts
  | "complianceReference" // read-only Register: Risiken, Kontrollen, Beratung, Beauftragte, ...
  | "revisionRecord" // Pruefungsobjekt, Pruefung, Feststellung, Personal, Governance-Register CRUD
  | "revisionGovernance" // Einstellungen/Org-Form (Singleton)
  | "revisionReport"
  | "revisionReport.acknowledge" // Geschäftsleitung-Kenntnisnahme eines finalen Berichts
  | "revisionPlan.approve" // Geschäftsleitung genehmigt den Jahres-Prüfungsplan
  | "doraRegister"; // DORA Art. 28-30 — IKT-Drittdienstleister-Register (Arrangements + Sub-Kette)

export type Action = "read" | "write" | "delete";

// Non-negotiable per the product spec: RBAC is enforced HERE, server-side, on every mutating
// route — never only hidden in the frontend. The UI may also hide controls for a role, but that
// is a convenience, not the control; a request that reaches the API is checked again from scratch.
const MATRIX: Record<Resource, Partial<Record<Action, Role[]>>> = {
  institution: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  outsourcingActivity: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
    delete: ["ADMIN"],
  },
  riskAnalysis: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  contract: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  handlungsoption: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  "handlungsoption.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // Dependency-Acceptance darf nur die Geschäftsleitung bestätigen
  },
  monitoring: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"],
  },
  weiterverlagerung: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  report: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  "report.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // Tz. 13 — Bericht ist an die Geschäftsleitung gebunden
  },
  auditLog: {
    read: ["COMPLIANCE", "INTERNE_REVISION", "GESCHAEFTSLEITUNG", "ADMIN"],
  },
  user: {
    read: ["ADMIN", "GESCHAEFTSLEITUNG"],
    write: ["ADMIN"],
  },
  complianceRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "ADMIN"],
  },
  "complianceHandshake.decide": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  complianceGovernance: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    // Matches the frontend's own gate (governance/page.tsx uses canWriteCompliance, the same
    // check as every other complianceRecord-style write) — not Geschäftsleitung-restricted.
    write: ["COMPLIANCE", "ADMIN"],
  },
  complianceReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "ADMIN"],
  },
  "complianceReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  complianceReference: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
  },
  revisionRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  revisionGovernance: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  revisionReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  "revisionReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  "revisionPlan.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  // Mirrors outsourcingActivity's matrix — same roles care about ICT third-party arrangements as
  // about Auslagerungen generally, since the DORA register builds directly on that same data.
  doraRegister: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
    delete: ["ADMIN"],
  },
};

export function requirePermission(resource: Resource, action: Action) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    const allowed = role && MATRIX[resource][action]?.includes(role);
    if (!allowed) {
      throw new ForbiddenError(
        `Rolle "${role ?? "unbekannt"}" darf "${action}" auf "${resource}" nicht ausführen.`
      );
    }
    next();
  };
}
