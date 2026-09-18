import { describe, expect, it } from "vitest";
import { assertValidContractFile, MAX_CONTRACT_FILE_SIZE_BYTES } from "../src/modules/contracts/fileValidation";
import { ValidationError } from "../src/utils/errors";
import { buildObjectKey } from "../src/lib/objectStorage";

describe("assertValidContractFile", () => {
  it("accepts a PDF within the size limit", () => {
    expect(() => assertValidContractFile("application/pdf", 1024)).not.toThrow();
  });

  it("rejects a disallowed mime type", () => {
    expect(() => assertValidContractFile("application/x-msdownload", 1024)).toThrow(ValidationError);
  });

  it("rejects a file over the size limit", () => {
    expect(() => assertValidContractFile("application/pdf", MAX_CONTRACT_FILE_SIZE_BYTES + 1)).toThrow(ValidationError);
  });

  it("rejects a zero or negative size", () => {
    expect(() => assertValidContractFile("application/pdf", 0)).toThrow(ValidationError);
    expect(() => assertValidContractFile("application/pdf", -5)).toThrow(ValidationError);
  });
});

describe("buildObjectKey", () => {
  it("scopes the key to institution and activity, and strips unsafe characters from the filename", () => {
    const key = buildObjectKey("inst-1", "activity-1", "../../etc/passwd; rm -rf.pdf");
    expect(key.startsWith("contracts/inst-1/activity-1/")).toBe(true);
    // Slashes/spaces/semicolons in the filename are stripped, so no extra path segment (and no
    // shell-metacharacter lookalike) can survive into the final filename segment of the key.
    const filenameSegment = key.slice("contracts/inst-1/activity-1/".length);
    expect(filenameSegment).not.toContain("/");
    expect(filenameSegment).not.toContain(" ");
    expect(filenameSegment).not.toContain(";");
  });

  it("produces a different key on each call (uuid collision protection)", () => {
    const a = buildObjectKey("inst-1", "activity-1", "vertrag.pdf");
    const b = buildObjectKey("inst-1", "activity-1", "vertrag.pdf");
    expect(a).not.toBe(b);
  });
});
