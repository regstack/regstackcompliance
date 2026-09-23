import { describe, expect, it } from "vitest";
import {
  buildIcsEvidenceKey,
  buildIcsPolicyKey,
  assertIcsKeyBelongsToInstitution,
} from "../src/modules/ics/objectStorage";
import { HttpError } from "../src/utils/errors";

describe("buildIcsEvidenceKey / buildIcsPolicyKey — ICS object storage keys", () => {
  it("namespaces an evidence key by institution and test", () => {
    const key = buildIcsEvidenceKey("inst-1", "test-1", "nachweis.pdf");
    expect(key).toMatch(/^ics-evidence\/inst-1\/test-1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("namespaces a policy key by institution only", () => {
    const key = buildIcsPolicyKey("inst-1", "richtlinie.pdf");
    expect(key).toMatch(/^ics-policies\/inst-1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("never carries the original file name into either key", () => {
    const evidence = buildIcsEvidenceKey("inst-1", "test-1", "../../etc/passwd; DROP TABLE users;.pdf");
    expect(evidence).not.toContain("etc/passwd");
    const policy = buildIcsPolicyKey("inst-1", "../../etc/passwd; DROP TABLE users;.pdf");
    expect(policy).not.toContain("etc/passwd");
  });
});

describe("assertIcsKeyBelongsToInstitution — cross-tenant IDOR guard", () => {
  it("accepts an evidence key actually minted for this institution", () => {
    const key = buildIcsEvidenceKey("inst-1", "test-1", "nachweis.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(key, "inst-1")).not.toThrow();
  });

  it("accepts a policy key actually minted for this institution", () => {
    const key = buildIcsPolicyKey("inst-1", "richtlinie.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(key, "inst-1")).not.toThrow();
  });

  it("rejects a foreign institution's evidence key", () => {
    const foreignKey = buildIcsEvidenceKey("inst-A", "test-A", "confidential.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(foreignKey, "inst-B")).toThrow(HttpError);
  });

  it("rejects a foreign institution's policy key", () => {
    const foreignKey = buildIcsPolicyKey("inst-A", "confidential.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(foreignKey, "inst-B")).toThrow(HttpError);
  });

  it("rejects an unrelated/malformed key", () => {
    expect(() => assertIcsKeyBelongsToInstitution("not-an-ics-key-at-all", "inst-1")).toThrow(HttpError);
  });

  it("rejects a key that merely starts with the institution id as a substring of another id", () => {
    const key = buildIcsEvidenceKey("inst-10", "test-1", "nachweis.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(key, "inst-1")).toThrow(HttpError);
  });

  it("does not accept an evidence-prefixed key for a policy check or vice versa across institutions", () => {
    // Both prefixes are checked (a caller might legitimately hold either kind), but the
    // institution segment must still match for whichever prefix is present.
    const evidenceKey = buildIcsEvidenceKey("inst-1", "test-1", "a.pdf");
    const policyKey = buildIcsPolicyKey("inst-1", "b.pdf");
    expect(() => assertIcsKeyBelongsToInstitution(evidenceKey, "inst-1")).not.toThrow();
    expect(() => assertIcsKeyBelongsToInstitution(policyKey, "inst-1")).not.toThrow();
    expect(() => assertIcsKeyBelongsToInstitution(evidenceKey, "inst-2")).toThrow(HttpError);
    expect(() => assertIcsKeyBelongsToInstitution(policyKey, "inst-2")).toThrow(HttpError);
  });
});
