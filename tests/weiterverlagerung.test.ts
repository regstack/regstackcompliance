import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requirePermission } from "../src/middleware/rbac";
import { ForbiddenError } from "../src/utils/errors";
import { collectRemovalIds } from "../src/modules/weiterverlagerung/tree";

function mockReq(role?: string): Request {
  return { user: role ? { userId: "u1", institutionId: "i1", role } : undefined } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("requirePermission — weiterverlagerung resource", () => {
  it("allows AUSLAGERUNGSBEAUFTRAGTER to write a chain node", () => {
    const next = vi.fn();
    requirePermission("weiterverlagerung", "write")(mockReq("AUSLAGERUNGSBEAUFTRAGTER"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects VIEWER writing a chain node, but allows read", () => {
    expect(() => requirePermission("weiterverlagerung", "write")(mockReq("VIEWER"), mockRes, vi.fn())).toThrow(
      ForbiddenError
    );
    const next = vi.fn();
    requirePermission("weiterverlagerung", "read")(mockReq("VIEWER"), mockRes, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects RISIKOCONTROLLING writing a chain node (only Auslagerungsbeauftragte/Compliance/Admin may)", () => {
    expect(() =>
      requirePermission("weiterverlagerung", "write")(mockReq("RISIKOCONTROLLING"), mockRes, vi.fn())
    ).toThrow(ForbiddenError);
  });
});

describe("collectRemovalIds — descendant cascade for soft-delete", () => {
  const chain = [
    { id: "root", parentId: null },
    { id: "child-a", parentId: "root" },
    { id: "child-b", parentId: "root" },
    { id: "grandchild", parentId: "child-a" },
    { id: "unrelated-root", parentId: null },
  ];

  it("removing a leaf node only removes itself", () => {
    expect(collectRemovalIds("grandchild", chain).sort()).toEqual(["grandchild"]);
  });

  it("removing a node removes every descendant at any depth, and nothing else", () => {
    expect(collectRemovalIds("root", chain).sort()).toEqual(
      ["child-a", "child-b", "grandchild", "root"].sort()
    );
  });

  it("removing a mid-level node removes it and its children, but not its siblings or ancestor", () => {
    expect(collectRemovalIds("child-a", chain).sort()).toEqual(["child-a", "grandchild"].sort());
  });
});
