import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { rateLimit } from "../src/middleware/rateLimit";
import { TooManyRequestsError } from "../src/utils/errors";

function mockReq(ip = "1.1.1.1"): Request {
  return { ip } as unknown as Request;
}

const mockRes = {} as unknown as Response;

describe("rateLimit — per-key fixed-window limiter", () => {
  it("allows requests under the limit", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 3 });
    const next = vi.fn();
    limiter(mockReq(), mockRes, next);
    limiter(mockReq(), mockRes, next);
    limiter(mockReq(), mockRes, next);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it("rejects once a key exceeds the limit within the window", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });
    const next = vi.fn();
    limiter(mockReq(), mockRes, next);
    limiter(mockReq(), mockRes, next);
    expect(() => limiter(mockReq(), mockRes, next)).toThrow(TooManyRequestsError);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("tracks separate keys independently", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();
    limiter(mockReq("1.1.1.1"), mockRes, next);
    limiter(mockReq("2.2.2.2"), mockRes, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("resets the count after the window elapses", () => {
    vi.useFakeTimers();
    const limiter = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();
    limiter(mockReq(), mockRes, next);
    expect(() => limiter(mockReq(), mockRes, next)).toThrow(TooManyRequestsError);
    vi.advanceTimersByTime(1001);
    expect(() => limiter(mockReq(), mockRes, next)).not.toThrow();
    vi.useRealTimers();
  });
});
