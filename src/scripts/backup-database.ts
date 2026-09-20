import { appendFileSync } from "fs";
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
  .then((result) => {
    logger.info(result, "Backup abgeschlossen");
    // Lets .github/workflows/backup.yml's verify-restore job fetch this exact backup straight
    // from S3 (already access-controlled + encrypted-at-rest) instead of ever handling the
    // plaintext dump.sql itself or passing it around as a broadly-downloadable Actions artifact.
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `dump-key=${result.key}\n`);
    }
  })
  .catch((err) => {
    logger.error(err, "Backup fehlgeschlagen");
    process.exitCode = 1;
  });
