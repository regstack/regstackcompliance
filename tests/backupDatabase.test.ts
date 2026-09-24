import { describe, expect, it } from "vitest";
import {
  backupObjectKey,
  parseBackupTimestamp,
  sanitizeForPgDump,
  selectStaleKeysTiered,
} from "../src/modules/backup/backupDatabase";

describe("sanitizeForPgDump", () => {
  it("strips Prisma-only query params pg_dump rejects outright", () => {
    const url = sanitizeForPgDump("postgresql://user:pass@host:5432/db?schema=public&connection_limit=5&sslmode=require");
    expect(url).not.toContain("schema=");
    expect(url).not.toContain("connection_limit=");
    expect(url).toContain("sslmode=require");
  });

  it("leaves a URL with no query params untouched", () => {
    expect(sanitizeForPgDump("postgresql://user:pass@host:5432/db")).toBe("postgresql://user:pass@host:5432/db");
  });
});

describe("backupObjectKey", () => {
  it("produces a sortable, S3-safe key under the backup prefix", () => {
    const key = backupObjectKey(new Date("2026-03-04T05:06:07.891Z"));
    expect(key).toBe("db-backups/2026-03-04T05-06-07-891Z.sql.gz");
  });
});

describe("parseBackupTimestamp", () => {
  it("round-trips whatever backupObjectKey produced", () => {
    const at = new Date("2026-03-04T05:06:07.891Z");
    expect(parseBackupTimestamp(backupObjectKey(at))?.getTime()).toBe(at.getTime());
  });

  it("returns null for a key that isn't one of ours", () => {
    expect(parseBackupTimestamp("db-backups/some-hand-uploaded-file.sql.gz")).toBeNull();
    expect(parseBackupTimestamp("db-backups/2026-03-04.sql.gz")).toBeNull();
  });
});

describe("selectStaleKeysTiered — daily/weekly/monthly backup retention", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");
  const keyAt = (iso: string) => backupObjectKey(new Date(iso));

  it("keeps every backup inside the daily window", () => {
    const keys = [keyAt("2026-06-15T02:00:00.000Z"), keyAt("2026-06-10T02:00:00.000Z"), keyAt("2026-06-09T02:00:00.000Z")];
    expect(selectStaleKeysTiered(keys, now, { dailyDays: 7, weeklyWeeks: 4, monthlyMonths: 12 })).toEqual([]);
  });

  it("collapses same-week backups outside the daily window to the newest", () => {
    const older = keyAt("2026-06-10T02:00:00.000Z"); // Wednesday
    const newer = keyAt("2026-06-12T02:00:00.000Z"); // Friday, same ISO week
    const keys = [older, newer];
    const stale = selectStaleKeysTiered(keys, now, { dailyDays: 0, weeklyWeeks: 4, monthlyMonths: 12 });
    expect(stale).toEqual([older]);
  });

  it("collapses same-month backups outside the weekly window to the newest", () => {
    const older = keyAt("2026-01-05T02:00:00.000Z");
    const newer = keyAt("2026-01-20T02:00:00.000Z");
    const keys = [older, newer];
    const stale = selectStaleKeysTiered(keys, now, { dailyDays: 0, weeklyWeeks: 0, monthlyMonths: 12 });
    expect(stale).toEqual([older]);
  });

  it("drops backups older than all three windows", () => {
    const ancient = keyAt("2024-01-01T00:00:00.000Z");
    const keys = [ancient];
    expect(selectStaleKeysTiered(keys, now, { dailyDays: 0, weeklyWeeks: 0, monthlyMonths: 1 })).toEqual([ancient]);
  });

  it("never marks a foreign/unparseable key as stale", () => {
    const foreign = "db-backups/manual-export.sql.gz";
    const keys = [foreign, keyAt("2020-01-01T00:00:00.000Z")];
    const stale = selectStaleKeysTiered(keys, now, { dailyDays: 0, weeklyWeeks: 0, monthlyMonths: 0 });
    expect(stale).not.toContain(foreign);
  });

  it("never mutates the input array", () => {
    const keys = [keyAt("2026-01-01T00:00:00.000Z"), keyAt("2026-01-02T00:00:00.000Z")];
    const copy = [...keys];
    selectStaleKeysTiered(keys, now, { dailyDays: 0, weeklyWeeks: 0, monthlyMonths: 0 });
    expect(keys).toEqual(copy);
  });
});
