import { NextFunction, Request, Response } from "express";
import { AccessModule, Role } from "@prisma/client";
import { ForbiddenError } from "../utils/errors";
import { prisma } from "../db/prisma";
import { asyncHandler } from "../utils/asyncHandler";

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
  | "riskManagementRecord" // Risikoinventur, Risikotragfähigkeit, NPL-Kennzahlen (AT 4.2 Tz. 3)
  | "riskStrategy" // Geschäfts-/Risikostrategie, Entwurf-Phase (CRUD)
  | "riskStrategy.approve" // Verabschiedung durch die Geschäftsleitung, AT 4.2
  | "riskManagementReport" // inkl. Aufsichtsorgan-Reporting (AT 3.2), unterschieden über "empfaenger"
  | "riskManagementReport.acknowledge" // Geschäftsleitung-Kenntnisnahme eines finalen Berichts
  | "riskCapitalPlanning" // AT 4.1 Tz. 10 — Kapitalplanungsprozess, Entwurf-Phase (CRUD)
  | "riskCapitalPlanning.approve" // Verabschiedung durch die Geschäftsleitung, analog riskStrategy.approve
  | "riskStressTest" // AT 4.3.3 — Stresstests (Sensitivität/Szenario/inverser Stresstest/Gesamtbank)
  | "modelGovernanceRecord" // Modellregister und -validierungen, AT 4.3.4
  | "itGovernanceRecord" // IT-Strategie, Entwurf-Phase (CRUD)
  | "itStrategy.approve" // Verabschiedung durch die Geschäftsleitung, BAIT Kap. 1
  | "itRiskRecord" // Schutzbedarfsfeststellung (ItAsset), Informationsrisiken (ItRisiko)
  | "itRisk.accept" // Geschäftsleitung akzeptiert verbleibendes Restrisiko, BAIT Kap. 3
  | "itSecurityIncident" // Sicherheitsvorfälle, BAIT Kap. 4
  | "itAccessRecord" // Berechtigungsvergabe/-rezertifizierung/-entzug, BAIT Kap. 6
  | "itProjectRecord" // IT-Projekte inkl. Lessons Learned, BAIT Kap. 7
  | "itOperationsRecord" // Änderungsmanagement (Kap. 8, Tz. 8.4-8.5) und Betriebsstörungen (Tz. 8.6)
  | "itContingencyRecord" // IT-Notfallpläne und -tests, BAIT Kap. 10
  | "nachweis" // Generisches Nachweis-/Belegregister, modulübergreifend (Outsourcing, Compliance,
  // Interne Revision, Risikomanagement, IT-Risiko)
  | "moduleAccessGrant"; // Zugriffsfreigabe Interne Revision -> jedes andere Modul (Anfrage/Genehmigung/Entzug)

export type Action = "read" | "write" | "delete";

// Non-negotiable per the product spec: RBAC is enforced HERE, server-side, on every mutating
// route — never only hidden in the frontend. The UI may also hide controls for a role, but that
// is a convenience, not the control; a request that reaches the API is checked again from scratch.
const MATRIX: Record<Resource, Partial<Record<Action, Role[]>>> = {
  institution: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    // Institutsgröße (sizeClass) treibt institutsweite Erleichterungen (Berichtsformat Tz. 13,
    // Prüfzyklus, Revisionsbeauftragter Tz. 10, qualitativer Ansatz Tz. 2) — Interne Revision stuft
    // die Größenklasse ein und pflegt sie hier, zusätzlich zur bisherigen Geschäftsleitung/Admin-Hoheit.
    write: ["GESCHAEFTSLEITUNG", "INTERNE_REVISION", "ADMIN"],
  },
  outsourcingActivity: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
    delete: ["ADMIN"],
  },
  riskAnalysis: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  contract: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  handlungsoption: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  "handlungsoption.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // Dependency-Acceptance darf nur die Geschäftsleitung bestätigen
  },
  monitoring: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"],
  },
  weiterverlagerung: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "ADMIN"],
  },
  report: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  "report.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // Tz. 13 — Bericht ist an die Geschäftsleitung gebunden
  },
  auditLog: {
    read: ["COMPLIANCE", "INTERNE_REVISION", "GESCHAEFTSLEITUNG", "ADMIN", "PRUEFER"],
  },
  user: {
    read: ["ADMIN", "GESCHAEFTSLEITUNG"],
    write: ["ADMIN"],
  },
  complianceRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "ADMIN"],
  },
  "complianceHandshake.decide": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  complianceGovernance: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    // Matches the frontend's own gate (governance/page.tsx uses canWriteCompliance, the same
    // check as every other complianceRecord-style write) — not Geschäftsleitung-restricted.
    write: ["COMPLIANCE", "ADMIN"],
  },
  complianceReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "ADMIN"],
  },
  "complianceReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  complianceReference: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
  },
  revisionRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  revisionGovernance: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  revisionReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  "revisionReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  "revisionPlan.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  accountingRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["BUCHHALTUNG", "ADMIN"],
  },
  accountingReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["BUCHHALTUNG", "ADMIN"],
  },
  "accountingReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  icsProcess: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  icsControl: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  icsTesting: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "INTERNE_REVISION", "ADMIN"],
  },
  icsPolicy: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "BUCHHALTUNG", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "COMPLIANCE", "ADMIN"],
  },
  externalAuditRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["INTERNE_REVISION", "ADMIN"],
  },
  "externalAuditRecord.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  ictRegister: {
    // Same role split as outsourcingActivity: ICT third-party risk sits alongside outsourcing
    // risk management, handled by the same actors.
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  riskManagementRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  riskStrategy: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskStrategy.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // AT 4.2 — Strategien sind an die Geschäftsleitung gebunden
  },
  riskManagementReport: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  modelGovernanceRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskManagementReport.acknowledge": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"],
  },
  riskCapitalPlanning: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "riskCapitalPlanning.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // AT 4.1 Tz. 10 — muss mit der Geschäftsstrategie im Einklang stehen, GL-Sache wie riskStrategy.approve
  },
  riskStressTest: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itGovernanceRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    // Kein eigener ISB-Login in diesem MVP (siehe Risikomanagement_BAIT_MVP_Spezifikation.md,
    // offene Frage 3) — RISIKOCONTROLLING trägt die Schreibrechte vorläufig mit.
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "itStrategy.approve": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // BAIT Kap. 1 — Verabschiedung ist Geschäftsleitungssache
  },
  itRiskRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  "itRisk.accept": {
    write: ["GESCHAEFTSLEITUNG", "ADMIN"], // verbleibendes hohes Restrisiko braucht GL-Akzeptanz, BAIT Kap. 3
  },
  itSecurityIncident: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itAccessRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itProjectRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itOperationsRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  itContingencyRecord: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["RISIKOCONTROLLING", "ADMIN"],
  },
  // Write-Rollen sind die Vereinigung der Schreibrollen aller Module, die heute Nachweise ablegen
  // (Outsourcing: AUSLAGERUNGSBEAUFTRAGTER, Compliance: COMPLIANCE, Interne Revision:
  // INTERNE_REVISION, Risikomanagement/IT-Risiko: RISIKOCONTROLLING) — kein modulspezifisches
  // Gating hier, das bleibt Aufgabe des aufrufenden Moduls (Entität muss dort schon lesbar sein).
  nachweis: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
    write: ["COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN"],
  },
  // Wer genehmigen/entziehen darf hängt vom angefragten Modul ab (Outsourcing vs. Compliance) und
  // wird darum in den Routen selbst geprüft (accessGrants.routes.ts), analog zum
  // gl-mitteilungen/sonderauftraege-Muster in revisions/governance.routes.ts. Diese Matrix-Zeile
  // deckt nur das gemeinsame Lesen der Freigabe-Datensätze ab.
  moduleAccessGrant: {
    read: ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER", "PRUEFER"],
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

// Static role permission (above) says INTERNE_REVISION *may* read another module's data in
// principle — this middleware adds the second, stateful condition the product now requires: that
// the fachbereich actually approved a ModuleAccessGrant for this institution+module (Outsourcing,
// Compliance, Accounting, IKS, Risikomanagement, IT-Risiko — Interne Revision's own module is
// never gated against itself). Only INTERNE_REVISION is gated; every other role that already
// passed requirePermission(..., "read") is unaffected, so this must run strictly AFTER
// requirePermission on the same route.
export function requireAccessGrant(accessModule: AccessModule) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "INTERNE_REVISION") {
      next();
      return;
    }
    const grant = await prisma.moduleAccessGrant.findUnique({
      where: { institutionId_module: { institutionId: req.user.institutionId, module: accessModule } },
    });
    if (grant?.status !== "APPROVED") {
      throw new ForbiddenError(
        `Interne Revision hat noch keine genehmigte Zugriffsfreigabe für "${accessModule}" — zuerst unter Zugriffsanfragen anfragen.`
      );
    }
    next();
  });
}
