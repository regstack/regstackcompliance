import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("requirePermission — server-side RBAC (non-negotiable, not UI-only)", () => {
  it("allows COMPLIANCE to write an outsourcingActivity", () => {
    const next = vi.fn();
    requirePermission("outsourcingActivity", "write")(mockReq("COMPLIANCE"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects VIEWER writing an outsourcingActivity", () => {
    const next = vi.fn();
    expect(() => requirePermission("outsourcingActivity", "write")(mockReq("VIEWER"), mockRes, next)).toThrow(
      ForbiddenError
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects everyone except GESCHAEFTSLEITUNG/ADMIN from approving a Handlungsoption dependency-acceptance", () => {
    expect(() =>
      requirePermission("handlungsoption.approve", "write")(mockReq("COMPLIANCE"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("handlungsoption.approve", "write")(mockReq("GESCHAEFTSLEITUNG"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects an unauthenticated request", () => {
    expect(() => requirePermission("report", "read")(mockReq(undefined), mockRes, vi.fn())).toThrow(ForbiddenError);
  });

  it("allows the same roles as outsourcingActivity to write the DORA ICT register, and VIEWER to read it", () => {
    const next = vi.fn();
    requirePermission("ictRegister", "write")(mockReq("RISIKOCONTROLLING"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();

    expect(() => requirePermission("ictRegister", "write")(mockReq("VIEWER"), mockRes, vi.fn())).toThrow(ForbiddenError);

    const readNext = vi.fn();
    requirePermission("ictRegister", "read")(mockReq("VIEWER"), mockRes, readNext);
    expect(readNext).toHaveBeenCalledOnce();
  });
});
