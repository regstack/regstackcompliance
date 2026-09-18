import type { NextFunction, Request, Response } from "express";
import { TooManyRequestsError } from "../utils/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window request limiter, keyed per-process in memory. Good enough for a single backend
 * instance; move the store to Redis if the backend is ever scaled to multiple instances.
 */
export function rateLimit(options: { windowMs: number; max: number; keyFn?: (req: Request) => string }) {
  const buckets = new Map<string, Bucket>();
  const keyFn = options.keyFn ?? ((req: Request) => req.ip ?? "unknown");

  return function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      throw new TooManyRequestsError();
    }

    bucket.count += 1;
    next();
  };
}
