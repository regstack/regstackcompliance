import { describe, expect, it } from "vitest";
import { buildObjectKey } from "../src/modules/contracts/objectStorage";

describe("buildObjectKey — contract file storage keys", () => {
  it("namespaces the key by institution and activity", () => {
    const key = buildObjectKey("inst-1", "act-1", "vertrag.pdf");
    expect(key).toMatch(/^contracts\/inst-1\/act-1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("never carries the original file name into the key", () => {
    const key = buildObjectKey("inst-1", "act-1", "../../etc/passwd; DROP TABLE users;.pdf");
    expect(key).not.toContain("etc/passwd");
    expect(key).not.toContain("DROP TABLE");
    expect(key).toMatch(/^contracts\/inst-1\/act-1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("drops the extension entirely when the file name has none", () => {
    const key = buildObjectKey("inst-1", "act-1", "vertrag");
    expect(key).toMatch(/^contracts\/inst-1\/act-1\/[0-9a-f-]{36}$/);
  });

  it("produces a fresh key on every call, even for the same file name", () => {
    const a = buildObjectKey("inst-1", "act-1", "vertrag.pdf");
    const b = buildObjectKey("inst-1", "act-1", "vertrag.pdf");
    expect(a).not.toBe(b);
  });
});
