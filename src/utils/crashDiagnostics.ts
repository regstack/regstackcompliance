import { Client } from "pg";

// Temporary diagnostic: writes fatal startup/request errors straight to Postgres via a raw `pg`
// connection, bypassing Prisma entirely. In place because Vercel's own runtime logs for this
// project have been unreachable all session, and the crash this exists to catch happens before
// or outside anything Express's normal error handler can see -- if Prisma Client construction
// itself is what's failing, going through Prisma to report that failure isn't an option.
// Remove once the FUNCTION_INVOCATION_FAILED crash on /auth/exchange is diagnosed and fixed.
export async function logCrash(context: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? null : null;
  // eslint-disable-next-line no-console
  console.error(`[crash-diagnostics] ${context}: ${message}`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query('INSERT INTO "_temp_debug_logs" (context, message, stack) VALUES ($1, $2, $3)', [
      context,
      message,
      stack,
    ]);
  } catch {
    // Best-effort -- if this also fails, the console.error above is all we get.
  } finally {
    await client.end().catch(() => undefined);
  }
}
