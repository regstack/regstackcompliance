import { describe, expect, it } from "vitest";
import { buildObjectKey, assertObjectKeyBelongsToInstitution } from "../src/modules/contracts/objectStorage";
import { HttpError } from "../src/utils/errors";

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

describe("assertObjectKeyBelongsToInstitution — cross-tenant IDOR guard", () => {
  it("accepts a key that was actually minted for this institution", () => {
    const key = buildObjectKey("inst-1", "act-1", "vertrag.pdf");
    expect(() => assertObjectKeyBelongsToInstitution(key, "inst-1")).not.toThrow();
  });

  it("rejects a foreign institution's key even when the caller owns a real activity", () => {
    const foreignKey = buildObjectKey("inst-A", "act-A", "confidential.pdf");
    expect(() => assertObjectKeyBelongsToInstitution(foreignKey, "inst-B")).toThrow(HttpError);
  });

  it("rejects an unrelated/malformed key, not just a different institution's real one", () => {
    expect(() => assertObjectKeyBelongsToInstitution("not-even-a-contracts-key", "inst-1")).toThrow(HttpError);
  });

  it("rejects a key that merely starts with the institution id as a substring of another id", () => {
    // "inst-1" must not match a key actually scoped to "inst-10" -- the check is a path-segment
    // prefix (institutionId + "/"), not just an unanchored substring test.
    const key = buildObjectKey("inst-10", "act-1", "vertrag.pdf");
    expect(() => assertObjectKeyBelongsToInstitution(key, "inst-1")).toThrow(HttpError);
  });
});
