import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Single shared client (Prisma manages its own connection pool). Loads dotenv itself (like
// config/env.ts does) rather than relying on some other module having imported config/env first
// — Prisma reads DATABASE_URL from process.env lazily on the first query, so whichever module
// happens to import this one first must not be able to skip that side effect.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
