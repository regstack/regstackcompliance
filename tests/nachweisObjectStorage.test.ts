import { describe, expect, it } from "vitest";
import { buildNachweisKey, assertNachweisKeyBelongsToInstitution } from "../src/modules/nachweise/objectStorage";
import { HttpError } from "../src/utils/errors";

describe("buildNachweisKey — evidence file storage keys", () => {
  it("namespaces the key by institution and module", () => {
    const key = buildNachweisKey("inst-1", "COMPLIANCE", "nachweis.pdf");
    expect(key).toMatch(/^nachweise\/inst-1\/COMPLIANCE\/[0-9a-f-]{36}\.pdf$/);
  });

  it("never carries the original file name into the key", () => {
    const key = buildNachweisKey("inst-1", "COMPLIANCE", "../../etc/passwd; DROP TABLE users;.pdf");
    expect(key).not.toContain("etc/passwd");
    expect(key).not.toContain("DROP TABLE");
    expect(key).toMatch(/^nachweise\/inst-1\/COMPLIANCE\/[0-9a-f-]{36}\.pdf$/);
  });

  it("drops the extension entirely when the file name has none", () => {
    const key = buildNachweisKey("inst-1", "COMPLIANCE", "nachweis");
    expect(key).toMatch(/^nachweise\/inst-1\/COMPLIANCE\/[0-9a-f-]{36}$/);
  });

  it("produces a fresh key on every call, even for the same file name", () => {
    const a = buildNachweisKey("inst-1", "COMPLIANCE", "nachweis.pdf");
    const b = buildNachweisKey("inst-1", "COMPLIANCE", "nachweis.pdf");
    expect(a).not.toBe(b);
  });
});

describe("assertNachweisKeyBelongsToInstitution — cross-tenant IDOR guard", () => {
  it("accepts a key that was actually minted for this institution", () => {
    const key = buildNachweisKey("inst-1", "COMPLIANCE", "nachweis.pdf");
    expect(() => assertNachweisKeyBelongsToInstitution(key, "inst-1")).not.toThrow();
  });

  it("rejects a foreign institution's key even for a real module value", () => {
    const foreignKey = buildNachweisKey("inst-A", "COMPLIANCE", "confidential.pdf");
    expect(() => assertNachweisKeyBelongsToInstitution(foreignKey, "inst-B")).toThrow(HttpError);
  });

  it("rejects an unrelated/malformed key, not just a different institution's real one", () => {
    expect(() => assertNachweisKeyBelongsToInstitution("not-even-a-nachweise-key", "inst-1")).toThrow(HttpError);
  });

  it("rejects a key that merely starts with the institution id as a substring of another id", () => {
    // "inst-1" must not match a key actually scoped to "inst-10" -- the check is a path-segment
    // prefix (institutionId + "/"), not just an unanchored substring test.
    const key = buildNachweisKey("inst-10", "COMPLIANCE", "nachweis.pdf");
    expect(() => assertNachweisKeyBelongsToInstitution(key, "inst-1")).toThrow(HttpError);
  });
});
