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

function parseBackupTimestamp(key: string): Date | null {
  const match = /(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.sql\.gz$/.exec(key);
  if (!match) return null;
  const [, datePart, hh, mm, ss, ms] = match;
  const parsed = new Date(`${datePart}T${hh}:${mm}:${ss}.${ms}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ISO 8601 week (Monday-start, week 1 = the week containing the year's first Thursday) — a stable
// bucket key independent of which weekday the daily backup job happens to run on.
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface RetentionTiers {
  dailyDays: number;
  weeklyWeeks: number;
  monthlyMonths: number;
}

// Grandfather-father-son tiering: every backup within the daily window is kept; beyond that, only
// the oldest backup in each ISO week is promoted to the weekly tier, then only the oldest backup in
// each calendar month to the monthly tier; anything past all three windows is stale. Keys that
// don't parse as a dated backup (nothing this module has ever written, or written by something
// else entirely) are never returned as stale — silently deleting an object we can't date is worse
// than silently keeping one to look at manually.
export function selectStaleKeysTiered(keys: string[], now: Date, tiers: RetentionTiers): string[] {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const dailyCutoffMs = tiers.dailyDays * DAY_MS;
  const weeklyCutoffMs = dailyCutoffMs + tiers.weeklyWeeks * 7 * DAY_MS;
  // 31 days/month is a deliberately generous upper bound for the monthly window's outer edge —
  // the per-month bucketing below is what actually caps it at one kept backup per calendar month,
  // this cutoff only decides how many months back to keep looking at all.
  const monthlyCutoffMs = weeklyCutoffMs + tiers.monthlyMonths * 31 * DAY_MS;

  const dated = keys
    .map((key) => ({ key, date: parseBackupTimestamp(key) }))
    .filter((k): k is { key: string; date: Date } => k.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const keep = new Set<string>();
  const weeklyBucketsSeen = new Set<string>();
  const monthlyBucketsSeen = new Set<string>();

  for (const { key, date } of dated) {
    const age = now.getTime() - date.getTime();
    if (age <= dailyCutoffMs) {
      keep.add(key);
    } else if (age <= weeklyCutoffMs) {
      const bucket = isoWeekKey(date);
      if (!weeklyBucketsSeen.has(bucket)) {
        weeklyBucketsSeen.add(bucket);
        keep.add(key);
      }
    } else if (age <= monthlyCutoffMs) {
      const bucket = monthKey(date);
      if (!monthlyBucketsSeen.has(bucket)) {
        monthlyBucketsSeen.add(bucket);
        keep.add(key);
      }
    }
  }

  return dated.map((d) => d.key).filter((key) => !keep.has(key));
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

  for (const key of selectStaleKeysTiered(keys, new Date(), RETENTION_TIERS)) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    logger.info({ key }, "Alte Datenbank-Sicherung gelöscht (Retention überschritten)");
  }
}

// Grandfather-father-son tiering matching the targets in docs/backup-disaster-recovery.md §2: 7
// daily / 4 weekly / 12 monthly by default.
const RETENTION_TIERS: RetentionTiers = {
  dailyDays: Number(process.env.BACKUP_RETENTION_DAILY_DAYS ?? 7),
  weeklyWeeks: Number(process.env.BACKUP_RETENTION_WEEKLY_WEEKS ?? 4),
  monthlyMonths: Number(process.env.BACKUP_RETENTION_MONTHLY_MONTHS ?? 12),
};

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
