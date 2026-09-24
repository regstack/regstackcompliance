import type { Request, Response } from "express";
import { logCrash } from "../src/utils/crashDiagnostics";

// Temporary diagnostic wiring (see src/utils/crashDiagnostics.ts) -- catches anything that would
// otherwise surface only as Vercel's generic FUNCTION_INVOCATION_FAILED, with no visibility into
// this project's own runtime logs to see why. Remove alongside crashDiagnostics.ts once resolved.
//
// Deliberately uses require() inside the try block, NOT a static top-level `import` -- a static
// import is hoisted and evaluated before any of this file's own code runs, so if the crash is an
// import-time throw anywhere in src/app.ts's dependency graph (exactly the class of bug the
// otplib/@scure fix earlier tonight was), wrapping a *call* to createApp() in try/catch can never
// catch it. Only wrapping the require() itself can.
process.on("uncaughtException", (err) => {
  void logCrash("uncaughtException", err);
});
process.on("unhandledRejection", (err) => {
  void logCrash("unhandledRejection", err);
});

// Vercel's Node.js runtime treats a default-exported Express app as a request handler —
// no app.listen() here, that's only for the local/persistent server entrypoint (src/server.ts).
let handler: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require("../src/app");
  handler = createApp();
} catch (err) {
  void logCrash("require(../src/app) or createApp()", err);
  handler = (_req: Request, res: Response) => {
    res.status(500).json({ error: "Startup failure, logged to _temp_debug_logs" });
  };
}

export default handler;
