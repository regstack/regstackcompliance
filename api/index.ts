import type { Request, Response } from "express";
import { logCrash } from "../src/utils/crashDiagnostics";

// Temporary diagnostic wiring (see src/utils/crashDiagnostics.ts) -- catches anything that would
// otherwise surface only as Vercel's generic FUNCTION_INVOCATION_FAILED, with no visibility into
// this project's own runtime logs to see why. Remove alongside crashDiagnostics.ts once resolved.
//
// Two things matter here, both learned the hard way tonight:
// 1. require() inside the try block, NOT a static top-level `import` -- a static import is
//    hoisted and evaluated before any of this file's own code runs, so it can never be caught by
//    wrapping a *call* to createApp().
// 2. The log write itself must be awaited as part of a real request/response cycle, not fired
//    and forgotten during cold start -- a bare `void logCrash(...)` during module load raced the
//    platform tearing the execution context down and never actually completed (confirmed: the
//    previous version of this file deployed, a real request failed, and _temp_debug_logs stayed
//    empty). Vercel/Express does wait for an async request handler's promise to resolve before
//    the response is considered sent, so doing the write there is the one place it's guaranteed
//    a chance to finish.
process.on("uncaughtException", (err) => {
  void logCrash("uncaughtException", err);
});
process.on("unhandledRejection", (err) => {
  void logCrash("unhandledRejection", err);
});

// Vercel's Node.js runtime treats a default-exported Express app as a request handler —
// no app.listen() here, that's only for the local/persistent server entrypoint (src/server.ts).
let handler: unknown;
let bootError: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require("../src/app");
  handler = createApp();
} catch (err) {
  bootError = err;
  handler = async (_req: Request, res: Response) => {
    await logCrash("require(../src/app) or createApp()", bootError);
    res.status(500).json({ error: "Startup failure, logged to _temp_debug_logs" });
  };
}

export default handler;
