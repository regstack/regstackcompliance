import { PrismaClient } from "@prisma/client";
import { logCrash } from "../utils/crashDiagnostics";

// Single shared client (Prisma manages its own connection pool). In tests, a fresh instance
// per test file is created instead — see tests/testUtils.ts.
let client: PrismaClient;
try {
  client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
} catch (err) {
  void logCrash("PrismaClient construction", err);
  throw err;
}
export const prisma = client;
