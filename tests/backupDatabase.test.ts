import { describe, expect, it } from "vitest";
import { backupObjectKey, sanitizeForPgDump, selectStaleKeysTiered } from "../src/modules/backup/backupDatabase";

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

describe("selectStaleKeysTiered — grandfather-father-son retention", () => {
  const TIERS = { dailyDays: 7, weeklyWeeks: 4, monthlyMonths: 12 };
  const NOW = new Date("2026-06-15T00:00:00.000Z");

  function keyFor(daysAgo: number): string {
    return backupObjectKey(new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000));
  }

  it("keeps every backup inside the daily window", () => {
    const keys = [keyFor(0), keyFor(3), keyFor(7)];
    expect(selectStaleKeysTiered(keys, NOW, TIERS)).toEqual([]);
  });

  it("collapses same-week backups past the daily window to one, keeping the oldest", () => {
    // Both fall in the same ISO week, well past the 7-day daily window.
    const olderInWeek = keyFor(10);
    const newerInWeek = keyFor(8);
    const kept = keyFor(1); // inside the daily window, always kept
    const stale = selectStaleKeysTiered([kept, olderInWeek, newerInWeek], NOW, TIERS);
    expect(stale).toEqual([newerInWeek]);
  });

  it("collapses same-month backups past the weekly window to one, keeping the oldest", () => {
    // ~50-60 days ago is past the daily+weekly window (7 + 4*7 = 35 days) but within 12 months.
    const olderInMonth = keyFor(58);
    const newerInMonth = keyFor(55);
    const stale = selectStaleKeysTiered([olderInMonth, newerInMonth], NOW, TIERS);
    expect(stale).toEqual([newerInMonth]);
  });

  it("drops backups older than every tier", () => {
    const ancient = keyFor(420); // past 7 + 4*7 + 12*31 = 407 days
    expect(selectStaleKeysTiered([ancient], NOW, TIERS)).toEqual([ancient]);
  });

  it("never treats a key it can't parse a date from as stale", () => {
    const junk = "db-backups/not-a-timestamp.sql.gz";
    expect(selectStaleKeysTiered([junk], NOW, TIERS)).toEqual([]);
  });

  it("never mutates the input array", () => {
    const keys = [keyFor(0), keyFor(400)];
    const copy = [...keys];
    selectStaleKeysTiered(keys, NOW, TIERS);
    expect(keys).toEqual(copy);
  });
});
