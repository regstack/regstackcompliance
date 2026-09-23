import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("requirePermission — Risikomanagement resources (MaRisk AT 4)", () => {
  it("allows RISIKOCONTROLLING to write a riskManagementRecord (Risikoinventur/RTF), but not COMPLIANCE", () => {
    const next = vi.fn();
    requirePermission("riskManagementRecord", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("riskManagementRecord", "write")(mockReq("COMPLIANCE"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may verabschieden a Risikostrategie", () => {
    expect(() =>
      requirePermission("riskStrategy.approve", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("riskStrategy.approve", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may acknowledge a riskManagementReport", () => {
    expect(() =>
      requirePermission("riskManagementReport.acknowledge", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("riskManagementReport.acknowledge", "write")(mockReq("ADMIN"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows RISIKOCONTROLLING to write riskCapitalPlanning (AT 4.1 Tz. 10), but not INTERNE_REVISION", () => {
    const next = vi.fn();
    requirePermission("riskCapitalPlanning", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() =>
      requirePermission("riskCapitalPlanning", "write")(mockReq("INTERNE_REVISION"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may verabschieden a Kapitalplanung", () => {
    expect(() =>
      requirePermission("riskCapitalPlanning.approve", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("riskCapitalPlanning.approve", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("allows RISIKOCONTROLLING to write a riskStressTest (AT 4.3.3), but not COMPLIANCE; every module role can read", () => {
    const next = vi.fn();
    requirePermission("riskStressTest", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("riskStressTest", "write")(mockReq("COMPLIANCE"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    const readNext = vi.fn();
    requirePermission("riskStressTest", "read")(mockReq("VIEWER"), mockRes, readNext);
    expect(readNext).toHaveBeenCalledOnce();
  });

  it("allows RISIKOCONTROLLING to write a riskModelRecord (AT 4.3.4 Modellregister), but not AUSLAGERUNGSBEAUFTRAGTER", () => {
    const next = vi.fn();
    requirePermission("riskModelRecord", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() =>
      requirePermission("riskModelRecord", "write")(mockReq("AUSLAGERUNGSBEAUFTRAGTER"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
  });
});

describe("requirePermission — IT-Risiko/BAIT resources", () => {
  it("allows RISIKOCONTROLLING to write itRiskRecord (Schutzbedarf/IT-Risiken), but not AUSLAGERUNGSBEAUFTRAGTER", () => {
    const next = vi.fn();
    requirePermission("itRiskRecord", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() =>
      requirePermission("itRiskRecord", "write")(mockReq("AUSLAGERUNGSBEAUFTRAGTER"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may accept a residual IT risk", () => {
    expect(() => requirePermission("itRisk.accept", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    const next = vi.fn();
    requirePermission("itRisk.accept", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may verabschieden an IT-Strategie", () => {
    expect(() => requirePermission("itStrategy.approve", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    const next = vi.fn();
    requirePermission("itStrategy.approve", "write")(mockReq("ADMIN"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("itSecurityIncident is readable by every module role, but only writable by RISIKOCONTROLLING/ADMIN", () => {
    const next = vi.fn();
    requirePermission("itSecurityIncident", "read")(mockReq("VIEWER"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("itSecurityIncident", "write")(mockReq("VIEWER"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });
});
