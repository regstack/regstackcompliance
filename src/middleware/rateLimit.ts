import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { TooManyRequestsError } from "../utils/errors";

/**
 * Fixed-window request limiter, backed by a `rate_limit_buckets` row per key -- deliberately
 * Postgres, not an in-memory Map. This backend deploys as a Vercel serverless function
 * (multi-instance, ephemeral per invocation/cold start); a per-process Map shares nothing across
 * concurrent requests, so it would silently do nothing in production while looking correct in
 * every local/single-instance test. This is exactly the limiter guarding login and TOTP
 * verification, so "silently does nothing" is a real brute-force exposure, not just a perf nit.
 *
 * `name` must be unique per rateLimit() call site -- it namespaces the shared table so two
 * limiters that happen to use the same keyFn shape (e.g. both keyed by bare req.ip) can never
 * collide with each other.
 *
 * The upsert is a single atomic statement: concurrent requests for the same key are serialized by
 * Postgres's own unique-constraint conflict handling, not by any application-level locking.
 */
export function rateLimit(options: {
  name: string;
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  const keyFn = options.keyFn ?? ((req: Request) => req.ip ?? "unknown");

  return async function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
    const key = `${options.name}:${keyFn(req)}`;
    const resetAt = new Date(Date.now() + options.windowMs);

    try {
      const [bucket] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
        INSERT INTO "rate_limit_buckets" ("key", "count", "resetAt")
        VALUES (${key}, 1, ${resetAt})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "rate_limit_buckets"."resetAt" <= now() THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
          "resetAt" = CASE WHEN "rate_limit_buckets"."resetAt" <= now() THEN ${resetAt} ELSE "rate_limit_buckets"."resetAt" END
        RETURNING "count", "resetAt"
      `;

      if (bucket.count > options.max) {
        throw new TooManyRequestsError();
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
