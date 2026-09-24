import type { Request, Response } from "express";
import { createApp } from "../src/app";
import { logCrash } from "../src/utils/crashDiagnostics";

// Temporary diagnostic wiring (see src/utils/crashDiagnostics.ts) -- catches anything that would
// otherwise surface only as Vercel's generic FUNCTION_INVOCATION_FAILED, with no visibility into
// this project's own runtime logs to see why. Remove alongside crashDiagnostics.ts once resolved.
process.on("uncaughtException", (err) => {
  void logCrash("uncaughtException", err);
});
process.on("unhandledRejection", (err) => {
  void logCrash("unhandledRejection", err);
});

// Vercel's Node.js runtime treats a default-exported Express app as a request handler —
// no app.listen() here, that's only for the local/persistent server entrypoint (src/server.ts).
let handler: ReturnType<typeof createApp> | ((req: Request, res: Response) => void);
try {
  handler = createApp();
} catch (err) {
  void logCrash("createApp", err);
  handler = (_req: Request, res: Response) => {
    res.status(500).json({ error: "Startup failure, logged to _temp_debug_logs" });
  };
}

export default handler;
