import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { gzipSync } from "zlib";
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../../utils/s3Client";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

const execFileAsync = promisify(execFile);

export const BACKUP_PREFIX = "db-backups/";
export const DUMP_FILE = "dump.sql";

// ISO-8601 timestamps (with ":"/"." replaced so the result is a valid S3 key) sort correctly as
// plain strings, so "newest first" is just a descending string sort — no need to parse dates back
// out of the key.
export function selectStaleKeys(keys: string[], retentionCount: number): string[] {
  return [...keys].sort((a, b) => (a > b ? -1 : 1)).slice(retentionCount);
}

export function backupObjectKey(now: Date = new Date()): string {
  return `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, "-")}.sql.gz`;
}

// Prisma's connection URL carries query params libpq/pg_dump don't understand (?schema=public is
// the one that made this fail outright — "invalid URI query parameter: schema" — Prisma-only
// pooler params like pgbouncer/connection_limit would fail the same way). --schema=public below is
// the real equivalent for pg_dump's purposes, so these are just dropped, not translated.
const PRISMA_ONLY_URL_PARAMS = ["schema", "pgbouncer", "connection_limit", "pool_timeout", "socket_timeout", "statement_cache_size"];

export function sanitizeForPgDump(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  for (const param of PRISMA_ONLY_URL_PARAMS) url.searchParams.delete(param);
  return url.toString();
}

// Dumps ONLY the "public" schema — the one Prisma owns — not Supabase's own internal schemas
// (auth, storage, realtime, their extensions and roles). Two reasons: (1) those are Supabase's own
// backup responsibility already, and (2) a dump including them would very likely fail to restore
// into a plain Postgres instance during a restore drill, since it references Supabase-specific
// extensions/roles that don't exist there. --no-owner/--no-acl for the same "restores somewhere
// else" reason: this instance's role names won't exist wherever a drill restores it.
//
// --clean --if-exists makes the dump idempotent: it DROPs each object (schema, types, tables)
// with IF EXISTS right before recreating it. Without this, pg_dump's very first statement — a
// plain `CREATE SCHEMA public;`, with no IF EXISTS — always fails against any real Postgres
// database, since every database already has a "public" schema by default; verified locally by
// restoring a non---clean dump with `psql -v ON_ERROR_STOP=1` and watching it abort on line 1.
export async function dumpDatabase(databaseUrl: string, outFile: string = DUMP_FILE): Promise<void> {
  await execFileAsync(
    "pg_dump",
    ["--schema=public", "--no-owner", "--no-acl", "--clean", "--if-exists", "--format=plain", "--file", outFile, sanitizeForPgDump(databaseUrl)],
    { maxBuffer: 1024 * 1024 * 1024 }
  );
}

async function pruneOldBackups(): Promise<void> {
  const bucket = env.s3BackupBucket;
  if (!bucket) throw new Error("S3_BACKUP_BUCKET oder S3_BUCKET muss gesetzt sein");

  const client = s3Client();
  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: BACKUP_PREFIX }));
  const keys = (listed.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);

  for (const key of selectStaleKeys(keys, RETENTION_COUNT)) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    logger.info({ key }, "Alte Datenbank-Sicherung gelöscht (Retention überschritten)");
  }
}

// Simple count-based retention (default 35 = roughly the daily tier from
// docs/backup-disaster-recovery.md). The weekly/monthly promotion described there isn't automated
// yet — every kept backup is still a full daily snapshot, just capped in number, not tiered.
const RETENTION_COUNT = Number(process.env.BACKUP_RETENTION_COUNT ?? 35);

export async function runDatabaseBackup(databaseUrl: string): Promise<{ key: string; bytes: number }> {
  const bucket = env.s3BackupBucket;
  if (!bucket) throw new Error("S3_BACKUP_BUCKET oder S3_BUCKET muss gesetzt sein");

  logger.info("Starte pg_dump …");
  await dumpDatabase(databaseUrl);

  const gz = gzipSync(await readFile(DUMP_FILE));
  const key = backupObjectKey();
  await s3Client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: gz, ContentType: "application/gzip" }));
  logger.info({ key, bytes: gz.length }, "Datenbank-Sicherung hochgeladen");

  await pruneOldBackups();
  return { key, bytes: gz.length };
}
