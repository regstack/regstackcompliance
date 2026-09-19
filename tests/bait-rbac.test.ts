import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

const ALL_ROLES = [
  "GESCHAEFTSLEITUNG",
  "COMPLIANCE",
  "RISIKOCONTROLLING",
  "INTERNE_REVISION",
  "AUSLAGERUNGSBEAUFTRAGTER",
  "ADMIN",
  "VIEWER",
];

describe("requirePermission — baitPruefung resource (IT-Prüfung register + Feststellungen)", () => {
  it("allows every role to read", () => {
    for (const role of ALL_ROLES) {
      const next = vi.fn();
      requirePermission("baitPruefung", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("allows INTERNE_REVISION and ADMIN to write, matching revisionRecord's write circle", () => {
    for (const role of ["INTERNE_REVISION", "ADMIN"]) {
      const next = vi.fn();
      requirePermission("baitPruefung", "write")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects COMPLIANCE, RISIKOCONTROLLING and VIEWER writing, but allows read", () => {
    for (const role of ["COMPLIANCE", "RISIKOCONTROLLING", "VIEWER"]) {
      expect(() => requirePermission("baitPruefung", "write")(mockReq(role), mockRes, vi.fn())).toThrow(ForbiddenError);
      const next = vi.fn();
      requirePermission("baitPruefung", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("only ADMIN may delete an IT-Prüfung or a Feststellung", () => {
    const next = vi.fn();
    requirePermission("baitPruefung", "delete")(mockReq("ADMIN"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("baitPruefung", "delete")(mockReq("INTERNE_REVISION"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("rejects an unauthenticated request", () => {
    expect(() => requirePermission("baitPruefung", "read")(mockReq(undefined), mockRes, vi.fn())).toThrow(ForbiddenError);
  });
});

describe("requirePermission — baitRisiko resource (Informationsverbund + Risikobewertung register)", () => {
  it("allows every role to read", () => {
    for (const role of ALL_ROLES) {
      const next = vi.fn();
      requirePermission("baitRisiko", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("allows COMPLIANCE, RISIKOCONTROLLING and ADMIN to write", () => {
    for (const role of ["COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"]) {
      const next = vi.fn();
      requirePermission("baitRisiko", "write")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects INTERNE_REVISION and VIEWER writing, but allows read (audit oversight is read-only here)", () => {
    for (const role of ["INTERNE_REVISION", "VIEWER"]) {
      expect(() => requirePermission("baitRisiko", "write")(mockReq(role), mockRes, vi.fn())).toThrow(ForbiddenError);
      const next = vi.fn();
      requirePermission("baitRisiko", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects GESCHAEFTSLEITUNG writing directly (read-only for this resource, same as doraRegister)", () => {
    expect(() => requirePermission("baitRisiko", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("only ADMIN may delete", () => {
    const next = vi.fn();
    requirePermission("baitRisiko", "delete")(mockReq("ADMIN"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("baitRisiko", "delete")(mockReq("COMPLIANCE"), mockRes, vi.fn())).toThrow(ForbiddenError);
  });

  it("rejects an unauthenticated request", () => {
    expect(() => requirePermission("baitRisiko", "read")(mockReq(undefined), mockRes, vi.fn())).toThrow(ForbiddenError);
  });
});
