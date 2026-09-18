import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("requirePermission — doraRegister resource", () => {
  it("allows every role that can also touch outsourcingActivity to read", () => {
    for (const role of [
      "GESCHAEFTSLEITUNG",
      "COMPLIANCE",
      "RISIKOCONTROLLING",
      "INTERNE_REVISION",
      "AUSLAGERUNGSBEAUFTRAGTER",
      "ADMIN",
      "VIEWER",
    ]) {
      const next = vi.fn();
      requirePermission("doraRegister", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("allows AUSLAGERUNGSBEAUFTRAGTER, COMPLIANCE, RISIKOCONTROLLING and ADMIN to write", () => {
    for (const role of ["AUSLAGERUNGSBEAUFTRAGTER", "COMPLIANCE", "RISIKOCONTROLLING", "ADMIN"]) {
      const next = vi.fn();
      requirePermission("doraRegister", "write")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects VIEWER and INTERNE_REVISION writing an arrangement, but allows read", () => {
    for (const role of ["VIEWER", "INTERNE_REVISION"]) {
      expect(() => requirePermission("doraRegister", "write")(mockReq(role), mockRes, vi.fn())).toThrow(
        ForbiddenError
      );
      const next = vi.fn();
      requirePermission("doraRegister", "read")(mockReq(role), mockRes, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects GESCHAEFTSLEITUNG writing directly (read-only for this resource, same as outsourcingActivity)", () => {
    expect(() => requirePermission("doraRegister", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("only ADMIN may delete an arrangement", () => {
    const next = vi.fn();
    requirePermission("doraRegister", "delete")(mockReq("ADMIN"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() => requirePermission("doraRegister", "delete")(mockReq("AUSLAGERUNGSBEAUFTRAGTER"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });

  it("rejects an unauthenticated request", () => {
    expect(() => requirePermission("doraRegister", "read")(mockReq(undefined), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
  });
});
