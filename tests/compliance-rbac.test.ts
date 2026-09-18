import { describe, expect, it, vi } from "vitest";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";
import { canRespondToHandshake } from "../src/modules/compliance/handshake";

function mockReq(role?: string) {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as any;
}

describe("requirePermission — compliance resources", () => {
  it("allows COMPLIANCE to write a complianceRecord (Quelle/Norm/Feststellung/...)", () => {
    const next = vi.fn();
    requirePermission("complianceRecord", "write")(mockReq("COMPLIANCE"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects RISIKOCONTROLLING writing a complianceRecord, but allows read", () => {
    expect(() => requirePermission("complianceRecord", "write")(mockReq("RISIKOCONTROLLING"), {} as any, vi.fn())).toThrow(
      ForbiddenError
    );
    const next = vi.fn();
    requirePermission("complianceRecord", "read")(mockReq("RISIKOCONTROLLING"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may decide a disputed Normzuweisung-Handshake", () => {
    expect(() =>
      requirePermission("complianceHandshake.decide", "write")(mockReq("COMPLIANCE"), {} as any, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("complianceHandshake.decide", "write")(mockReq("GESCHAEFTSLEITUNG"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("COMPLIANCE (matching the frontend's own gate) may govern compliance settings, but RISIKOCONTROLLING may not", () => {
    const next = vi.fn();
    requirePermission("complianceGovernance", "write")(mockReq("COMPLIANCE"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(() =>
      requirePermission("complianceGovernance", "write")(mockReq("RISIKOCONTROLLING"), {} as any, vi.fn())
    ).toThrow(ForbiddenError);
  });

  it("only GESCHAEFTSLEITUNG/ADMIN may acknowledge a report", () => {
    expect(() =>
      requirePermission("complianceReport.acknowledge", "write")(mockReq("COMPLIANCE"), {} as any, vi.fn())
    ).toThrow(ForbiddenError);
    const next = vi.fn();
    requirePermission("complianceReport.acknowledge", "write")(mockReq("ADMIN"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("complianceReference is read-only for everyone with access, no role may write", () => {
    const next = vi.fn();
    requirePermission("complianceReference", "read")(mockReq("VIEWER"), {} as any, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("canRespondToHandshake — ownership, not role, gates the Fachbereich response", () => {
  it("allows the assigned user to respond while status is still 'vorschlag'", () => {
    expect(canRespondToHandshake({ assignedUserId: "u1", status: "vorschlag" }, "u1")).toBe(true);
  });

  it("rejects anyone other than the assigned user, regardless of role", () => {
    expect(canRespondToHandshake({ assignedUserId: "u1", status: "vorschlag" }, "u2")).toBe(false);
  });

  it("rejects a second response once the handshake has already moved past 'vorschlag'", () => {
    expect(canRespondToHandshake({ assignedUserId: "u1", status: "bestaetigt" }, "u1")).toBe(false);
    expect(canRespondToHandshake({ assignedUserId: "u1", status: "widersprochen" }, "u1")).toBe(false);
  });
});
