import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";
import { canReportMassnahmeErledigt } from "../src/modules/revisions/ownership";
import { isSelfReview, auditCloseBlocked } from "../src/modules/revisions/paper-checks";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("requirePermission — revision resources", () => {
  it("allows INTERNE_REVISION to write a revisionRecord, but not RISIKOCONTROLLING", () => {
    const next = vi.fn();
    requirePermission("revisionRecord", "write")(mockReq("INTERNE_REVISION"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("revisionRecord", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("revisionGovernance write is INTERNE_REVISION/ADMIN, not Geschäftsleitung-restricted", () => {
    const next = vi.fn();
    requirePermission("revisionGovernance", "write")(mockReq("INTERNE_REVISION"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() =>
      requirePermission("revisionGovernance", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may approve the Jahresplan or acknowledge a report", () => {
    expect(() => requirePermission("revisionPlan.approve", "write")(mockReq("INTERNE_REVISION"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    const next1 = vi.fn();
    requirePermission("revisionPlan.approve", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next1);
    expect(next1).toHaveBeenCalledOnce();

    expect(() =>
      requirePermission("revisionReport.acknowledge", "write")(mockReq("INTERNE_REVISION"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next2 = vi.fn();
    requirePermission("revisionReport.acknowledge", "write")(mockReq("ADMIN"), mockRes, next2);
    expect(next2).toHaveBeenCalledOnce();
  });
});

describe("canReportMassnahmeErledigt — ownership, not role, gates the Fachbereich report", () => {
  it("allows the Prüfungsobjekt's Verantwortliche/r", () => {
    expect(canReportMassnahmeErledigt("u1", "u1")).toBe(true);
  });

  it("rejects anyone else, and a null/undefined Verantwortliche/r", () => {
    expect(canReportMassnahmeErledigt("u1", "u2")).toBe(false);
    expect(canReportMassnahmeErledigt(null, "u1")).toBe(false);
    expect(canReportMassnahmeErledigt(undefined, "u1")).toBe(false);
  });
});

describe("isSelfReview / auditCloseBlocked — the 4-eyes gate, now server-enforced", () => {
  it("flags a paper reviewed by its own author", () => {
    expect(isSelfReview("u1", "u1")).toBe(true);
    expect(isSelfReview("u1", "u2")).toBe(false);
    expect(isSelfReview(null, "u1")).toBe(false);
  });

  it("blocks closing an audit with an open (non-freigegeben) paper", () => {
    expect(auditCloseBlocked([{ reviewStatus: "vorgelegt", reviewerUserId: "u2", erstellerUserId: "u1" }])).toBe(true);
  });

  it("blocks closing an audit with a self-reviewed paper even if marked freigegeben", () => {
    expect(auditCloseBlocked([{ reviewStatus: "freigegeben", reviewerUserId: "u1", erstellerUserId: "u1" }])).toBe(true);
  });

  it("allows closing when every paper is freigegeben by someone other than its author", () => {
    expect(
      auditCloseBlocked([
        { reviewStatus: "freigegeben", reviewerUserId: "u2", erstellerUserId: "u1" },
        { reviewStatus: "freigegeben", reviewerUserId: "u1", erstellerUserId: "u3" },
      ])
    ).toBe(false);
  });

  it("allows closing an audit with no papers at all", () => {
    expect(auditCloseBlocked([])).toBe(false);
  });
});

describe("requirePermission — externalAuditRecord (ExternePruefung + Feststellungen)", () => {
  it("allows INTERNE_REVISION to write, but not GESCHAEFTSLEITUNG or COMPLIANCE", () => {
    const next = vi.fn();
    requirePermission("externalAuditRecord", "write")(mockReq("INTERNE_REVISION"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("externalAuditRecord", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    expect(() => requirePermission("externalAuditRecord", "write")(mockReq("COMPLIANCE"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("lets every role read externalAuditRecord (every department needs to see its own findings)", () => {
    for (const role of ["GESCHAEFTSLEITUNG", "COMPLIANCE", "RISIKOCONTROLLING", "INTERNE_REVISION", "AUSLAGERUNGSBEAUFTRAGTER", "ADMIN", "VIEWER"]) {
      const next = vi.fn();
      requirePermission("externalAuditRecord", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may acknowledge the external auditor's report", () => {
    expect(() =>
      requirePermission("externalAuditRecord.acknowledge", "write")(mockReq("INTERNE_REVISION"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("externalAuditRecord.acknowledge", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
