import { describe, expect, it } from "vitest";
import { backupObjectKey, sanitizeForPgDump, selectStaleKeys } from "../src/modules/backup/backupDatabase";

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

describe("selectStaleKeys — backup retention", () => {
  it("keeps everything when under the retention count", () => {
    const keys = ["db-backups/2026-01-01.sql.gz", "db-backups/2026-01-02.sql.gz"];
    expect(selectStaleKeys(keys, 35)).toEqual([]);
  });

  it("drops the oldest keys once over the retention count", () => {
    const keys = [
      "db-backups/2026-01-01T00-00-00-000Z.sql.gz",
      "db-backups/2026-01-02T00-00-00-000Z.sql.gz",
      "db-backups/2026-01-03T00-00-00-000Z.sql.gz",
    ];
    expect(selectStaleKeys(keys, 2)).toEqual(["db-backups/2026-01-01T00-00-00-000Z.sql.gz"]);
  });

  it("never mutates the input array", () => {
    const keys = ["a", "b", "c"];
    selectStaleKeys(keys, 1);
    expect(keys).toEqual(["a", "b", "c"]);
  });
});

describe("backupObjectKey", () => {
  it("produces a sortable, S3-safe key under the backup prefix", () => {
    const key = backupObjectKey(new Date("2026-03-04T05:06:07.891Z"));
    expect(key).toBe("db-backups/2026-03-04T05-06-07-891Z.sql.gz");
  });
});
