import { runDatabaseBackup } from "../modules/backup/backupDatabase";
import { logger } from "../utils/logger";

// Independent, out-of-band backup of the production database — a second copy alongside
// Supabase's own PITR/backups (see docs/backup-disaster-recovery.md), not a replacement for it.
// Meant to run on a schedule (see .github/workflows/backup.yml, which also restores the dump this
// produces into a throwaway Postgres right after, to catch a bad backup the day it happens).
//
// DATABASE_URL here must be Supabase's DIRECT connection string (or session-mode pooler), not the
// transaction-mode pgbouncer pooler URL the app itself may use for regular queries — pg_dump needs
// session-level behavior transaction pooling doesn't provide.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  logger.error("Missing required env var DATABASE_URL");
  process.exit(1);
}

runDatabaseBackup(databaseUrl)
  .then((result) => logger.info(result, "Backup abgeschlossen"))
  .catch((err) => {
    logger.error(err, "Backup fehlgeschlagen");
    process.exitCode = 1;
  });
