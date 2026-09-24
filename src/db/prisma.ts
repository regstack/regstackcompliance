import { PrismaClient } from "@prisma/client";

// Single shared client (Prisma manages its own connection pool). In tests, a fresh instance
// per test file is created instead — see tests/testUtils.ts.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
