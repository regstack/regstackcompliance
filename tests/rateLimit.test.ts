import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { rateLimit } from "../src/middleware/rateLimit";
import { TooManyRequestsError } from "../src/utils/errors";

// rateLimit.ts is now Postgres-backed (see its own file comment for why an in-memory Map doesn't
// work on serverless) — mocked here instead of hitting a real DB, consistent with the rest of this
// suite (README: tests/ run "ohne DB-Abhängigkeit"). The mock emulates the same atomic-upsert
// semantics as the real SQL: reset to count=1 on a fresh/expired key, otherwise increment without
// extending the window.
const store = new Map<string, { count: number; resetAt: Date }>();

vi.mock("../src/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      const [key, insertResetAt] = values as [string, Date];
      const now = new Date();
      const existing = store.get(key);
      if (!existing || existing.resetAt <= now) {
        const fresh = { count: 1, resetAt: insertResetAt };
        store.set(key, fresh);
        return [fresh];
      }
      existing.count += 1;
      return [existing];
    }),
  },
}));

function mockReq(ip = "1.1.1.1"): Request {
  return { ip } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("rateLimit — per-key fixed-window limiter (Postgres-backed)", () => {
  beforeEach(() => store.clear());

  it("allows requests under the limit", async () => {
    const limiter = rateLimit({ name: "t1", windowMs: 1000, max: 3 });
    const next = vi.fn();
    await limiter(mockReq(), mockRes, next);
    await limiter(mockReq(), mockRes, next);
    await limiter(mockReq(), mockRes, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(next).not.toHaveBeenCalledWith(expect.anything());
  });

  it("rejects once a key exceeds the limit within the window", async () => {
    const limiter = rateLimit({ name: "t2", windowMs: 1000, max: 2 });
    const next = vi.fn();
    await limiter(mockReq(), mockRes, next);
    await limiter(mockReq(), mockRes, next);
    await limiter(mockReq(), mockRes, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenLastCalledWith(expect.any(TooManyRequestsError));
  });

  it("tracks separate keys independently", async () => {
    const limiter = rateLimit({ name: "t3", windowMs: 1000, max: 1 });
    const next = vi.fn();
    await limiter(mockReq("1.1.1.1"), mockRes, next);
    await limiter(mockReq("2.2.2.2"), mockRes, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalledWith(expect.anything());
  });

  it("namespaces by limiter name so two limiters with the same key can never collide", async () => {
    const a = rateLimit({ name: "a", windowMs: 1000, max: 1 });
    const b = rateLimit({ name: "b", windowMs: 1000, max: 1 });
    const next = vi.fn();
    await a(mockReq(), mockRes, next);
    await b(mockReq(), mockRes, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalledWith(expect.anything());
  });

  it("resets the count after the window elapses", async () => {
    vi.useFakeTimers();
    try {
      const limiter = rateLimit({ name: "t4", windowMs: 1000, max: 1 });
      const next = vi.fn();
      await limiter(mockReq(), mockRes, next);
      await limiter(mockReq(), mockRes, next);
      expect(next).toHaveBeenLastCalledWith(expect.any(TooManyRequestsError));

      vi.advanceTimersByTime(1001);
      await limiter(mockReq(), mockRes, next);
      expect(next).toHaveBeenLastCalledWith();
    } finally {
      vi.useRealTimers();
    }
  });
});
