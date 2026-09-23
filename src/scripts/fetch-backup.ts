import { writeFile } from "fs/promises";
import { gunzipSync } from "zlib";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../utils/s3Client";
import { env } from "../config/env";
import { DUMP_FILE } from "../modules/backup/backupDatabase";
import { logger } from "../utils/logger";

// Counterpart to backup-database.ts, used only by .github/workflows/backup.yml's verify-restore
// job: fetches one specific backup object straight from S3 (same client/credentials/endpoint
// config the app itself uses) and writes the decompressed dump to disk. Exists so that job never
// needs to touch a GitHub Actions artifact -- the plaintext dump (bcrypt hashes + raw TOTP
// secrets) must never be uploaded anywhere broadly downloadable, see the backup job's own comment.
const key = process.argv[2];
if (!key) {
  logger.error("Usage: backup:fetch <s3-object-key>");
  process.exit(1);
}

const bucket = env.s3BackupBucket;
if (!bucket) {
  logger.error("Missing required env var S3_BACKUP_BUCKET oder S3_BUCKET");
  process.exit(1);
}

async function main(): Promise<void> {
  const response = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const gz = await response.Body!.transformToByteArray();
  await writeFile(DUMP_FILE, gunzipSync(gz));
  logger.info({ key, bucket, bytes: gz.length }, "Sicherung von S3 geladen und entpackt");
}

main().catch((err) => {
  logger.error(err, "Laden der Sicherung von S3 fehlgeschlagen");
  process.exitCode = 1;
});
