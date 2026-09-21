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

export function backupObjectKey(now: Date = new Date()): string {
  return `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, "-")}.sql.gz`;
}

// Inverse of backupObjectKey: "YYYY-MM-DDTHH-MM-SS-mmmZ" -> a real Date. Returns null for any key
// that isn't one of ours (foreign object under the same prefix, hand-uploaded file, ...) so callers
// can leave those alone instead of guessing.
export function parseBackupTimestamp(key: string): Date | null {
  const match = key.match(/^db-backups\/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)\.sql\.gz$/);
  if (!match) return null;
  const [, date, hh, mm, ss, msZ] = match;
  const parsed = new Date(`${date}T${hh}:${mm}:${ss}.${msZ}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoWeekKey(d: Date): string {
  // ISO-8601 week: Thursday of the same week decides the week's year, weeks start Monday.
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface RetentionTiers {
  dailyDays: number;
  weeklyWeeks: number;
  monthlyMonths: number;
}

// Matches the targets in docs/backup-disaster-recovery.md section 2: 7 daily, 4 weekly, 12
// monthly.
export const DEFAULT_RETENTION_TIERS: RetentionTiers = { dailyDays: 7, weeklyWeeks: 4, monthlyMonths: 12 };

// Grandfather-father-son retention: every backup from the last `dailyDays` is kept outright: one
// per ISO week is kept for the following `weeklyWeeks`, promoted from whichever daily backups
// aged out; one per calendar month is kept for the following `monthlyMonths`, promoted the same
// way; anything older than all three windows — and any daily/weekly backup that lost its bucket's
// "newest" slot to a later one — is stale. Keys that don't parse as one of our own backup objects
// are never returned as stale, so a retention sweep can't delete something it doesn't recognize.
export function selectStaleKeysTiered(
  keys: string[],
  now: Date = new Date(),
  tiers: RetentionTiers = DEFAULT_RETENTION_TIERS
): string[] {
  const dailyCutoff = new Date(now.getTime() - tiers.dailyDays * 24 * 60 * 60 * 1000);
  const weeklyCutoff = new Date(dailyCutoff.getTime() - tiers.weeklyWeeks * 7 * 24 * 60 * 60 * 1000);
  const monthlyCutoff = new Date(weeklyCutoff);
  monthlyCutoff.setUTCMonth(monthlyCutoff.getUTCMonth() - tiers.monthlyMonths);

  const entries = keys
    .map((key) => ({ key, at: parseBackupTimestamp(key) }))
    .filter((e): e is { key: string; at: Date } => e.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime()); // newest first

  const keep = new Set<string>();
  const weeklyBucketsKept = new Set<string>();
  const monthlyBucketsKept = new Set<string>();

  for (const { key, at } of entries) {
    if (at >= dailyCutoff) {
      keep.add(key);
    } else if (at >= weeklyCutoff) {
      const bucket = isoWeekKey(at);
      if (!weeklyBucketsKept.has(bucket)) {
        weeklyBucketsKept.add(bucket);
        keep.add(key);
      }
    } else if (at >= monthlyCutoff) {
      const bucket = monthKey(at);
      if (!monthlyBucketsKept.has(bucket)) {
        monthlyBucketsKept.add(bucket);
        keep.add(key);
      }
    }
  }

  return keys.filter((key) => parseBackupTimestamp(key) !== null && !keep.has(key));
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

// Overrides for DEFAULT_RETENTION_TIERS — only meant for tests/local tuning, production runs on
// the doc's defaults (7 daily / 4 weekly / 12 monthly) unless these are explicitly set.
const RETENTION_TIERS: RetentionTiers = {
  dailyDays: Number(process.env.BACKUP_RETENTION_DAILY_DAYS ?? DEFAULT_RETENTION_TIERS.dailyDays),
  weeklyWeeks: Number(process.env.BACKUP_RETENTION_WEEKLY_WEEKS ?? DEFAULT_RETENTION_TIERS.weeklyWeeks),
  monthlyMonths: Number(process.env.BACKUP_RETENTION_MONTHLY_MONTHS ?? DEFAULT_RETENTION_TIERS.monthlyMonths),
};

async function pruneOldBackups(): Promise<void> {
  const bucket = env.s3BackupBucket;
  if (!bucket) throw new Error("S3_BACKUP_BUCKET oder S3_BUCKET muss gesetzt sein");

  const client = s3Client();
  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: BACKUP_PREFIX }));
  const keys = (listed.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);

  for (const key of selectStaleKeysTiered(keys, new Date(), RETENTION_TIERS)) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    logger.info({ key }, "Alte Datenbank-Sicherung gelöscht (Retention-Staffelung überschritten)");
  }
}

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
