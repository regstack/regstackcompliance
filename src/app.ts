import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { router } from "./routes";
import { HttpError } from "./utils/errors";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors()); // tighten to the deployed frontend origin before go-live
  app.use(express.json({ limit: "2mb" }));
  app.use(pinoHttp({ redact: ["req.headers.authorization"] }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", router);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  // Centralized error handler — HttpError (and subclasses like ForbiddenError/NotFoundError/
  // ValidationError) carry the intended status code; anything else is an unexpected 500 and is
  // logged with the stack rather than leaked to the client.
  app.use(
    (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      req.log?.error(err);
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: "Interner Fehler" });
    }
  );

  return app;
}
