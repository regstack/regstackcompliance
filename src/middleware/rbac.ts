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
  | "accountingRecord" // Bilanz, GuV, Anhang, Lagebericht — Entwurf-Erfassung/-Bearbeitung
  | "accountingReport" // Finalisierung (Entwurf -> final) je Dokumenttyp/Geschäftsjahr
  | "accountingReport.acknowledge" // Geschäftsleitung-Kenntnisnahme eines finalen Dokuments
  | "icsProcess" // IKS Geschäftsprozesse
  | "icsControl" // IKS Kontrollen (Zuordnung zu Prozessen)
  | "icsTesting" // IKS Kontrolltests inkl. Nachweisen
  | "icsPolicy" // IKS Richtlinien-/Workflow-Dokumentenbibliothek
  | "externalAuditRecord" // ExternePruefung + Feststellungen: von Interner Revision angelegt/verteilt
  | "externalAuditRecord.acknowledge" // Geschäftsleitung-Kenntnisnahme des externen Prüfungsberichts
  | "ictRegister" // DORA Art. 28-30 — ICT-Drittanbieter und Vertragsverhältnisse
  | "riskManagementRecord" // Risikoinventur, Risikotragfähigkeit
  | "riskStrategy" // Geschäfts-/Risikostrategie, Entwurf-Phase (CRUD)
  | "riskStrategy.approve" // Verabschiedung durch die Geschäftsleitung, AT 4.2
  | "riskManagementReport"
  | "riskManagementReport.acknowledge" // Geschäftsleitung-Kenntnisnahme eines finalen Berichts
  | "riskCapitalPlanning" // AT 4.1 Tz. 10 — Kapitalplanungsprozess, Entwurf-Phase (CRUD)
  | "riskCapitalPlanning.approve" // Verabschiedung durch die Geschäftsleitung, analog riskStrategy.approve
  | "riskStressTest" // AT 4.3.3 — Stresstests (Sensitivität/Szenario/inverser Stresstest/Gesamtbank)
  // AT 4.3.4 Modellregister intentionally has no resource here — PR #10/#13 build it independently.
  | "itGovernanceRecord" // IT-Strategie, Entwurf-Phase (CRUD)
  | "itStrategy.approve" // Verabschiedung durch die Geschäftsleitung, BAIT Kap. 1
  | "itRiskRecord" // Schutzbedarfsfeststellung (ItAsset), Informationsrisiken (ItRisiko)
  | "itRisk.accept" // Geschäftsleitung akzeptiert verbleibendes Restrisiko, BAIT Kap. 3
  | "itSecurityIncident" // Sicherheitsvorfälle, BAIT Kap. 4
  | "itOperationsRecord" // Betriebsstörungen, BAIT Kap. 8 (Änderungsmanagement/Berechtigungen/
  // Projekte sind bewusst nicht hier — siehe Risikomanagement_BAIT_MVP_Spezifikation.md,
  // "Koordination mit parallelen Sessions": PR #13 deckt diese Bausteine bereits ab)
  | "itContingencyRecord"; // IT-Notfallpläne und -tests, BAIT Kap. 10

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
  accountingRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["BUCHHALTUNG", "ADMIN"],
  },
  accountingReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["BUCHHALTUNG", "ADMIN"],
  },
  "accountingReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  icsProcess: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  icsControl: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  icsTesting: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "INTERNE_REVISION", "ADMIN"],
  },
  icsPolicy: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "COMPLIANCE", "ADMIN"],
  },
  externalAuditRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  "externalAuditRecord.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  ictRegister: {
    // Same role split as outsourcingActivity: ICT third-party risk sits alongside outsourcing
    // risk management, handled by the same actors.
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  riskManagementRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  riskStrategy: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskStrategy.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // AT 4.2 — Strategien sind an die Geschäftsleitung gebunden
  },
  riskManagementReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskManagementReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  riskCapitalPlanning: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskCapitalPlanning.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // AT 4.1 Tz. 10 — muss mit der Geschäftsstrategie im Einklang stehen, GL-Sache wie riskStrategy.approve
  },
  riskStressTest: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itGovernanceRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    // Kein eigener ISB-Login in diesem MVP (siehe Risikomanagement_BAIT_MVP_Spezifikation.md,
    // offene Frage 3) — RISIKOCONTROLLING trägt die Schreibrechte vorläufig mit.
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "itStrategy.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // BAIT Kap. 1 — Verabschiedung ist Geschäftsleitungssache
  },
  itRiskRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "itRisk.accept": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // verbleibendes hohes Restrisiko braucht GL-Akzeptanz, BAIT Kap. 3
  },
  itSecurityIncident: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itOperationsRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itContingencyRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
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
