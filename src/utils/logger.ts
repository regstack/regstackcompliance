import pino from "pino";
import { env } from "../config/env";

// Standalone logger for code that runs outside an HTTP request (scripts, jobs) — request
// handlers get their own logger from pino-http (req.log) instead.
export const logger = pino({ level: env.nodeEnv === "development" ? "debug" : "info" });
