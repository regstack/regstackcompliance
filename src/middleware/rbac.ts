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
  | "report"
  | "report.approve"
  | "auditLog"
  | "user";

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
