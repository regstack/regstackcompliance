import { describe, expect, it } from "vitest";
import { OTP } from "otplib";
import { generateTotpSecret, totpKeyUri, verifyTotpCode } from "../src/utils/totp";

const totp = new OTP({ strategy: "totp" });

describe("TOTP utility (src/utils/totp.ts)", () => {
  it("accepts a code generated from the same secret", async () => {
    const secret = generateTotpSecret();
    const code = await totp.generate({ secret });
    await expect(verifyTotpCode(secret, code)).resolves.toBe(true);
  });

  it("rejects a code generated from a different secret", async () => {
    const secret = generateTotpSecret();
    const otherSecret = generateTotpSecret();
    const code = await totp.generate({ secret: otherSecret });
    await expect(verifyTotpCode(secret, code)).resolves.toBe(false);
  });

  it("rejects a garbage code", async () => {
    const secret = generateTotpSecret();
    await expect(verifyTotpCode(secret, "000000")).resolves.toBe(false);
  });

  it("builds an otpauth:// URI carrying the RegStack issuer and the user's email", () => {
    const secret = generateTotpSecret();
    const uri = totpKeyUri("admin@regstack.de", secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("RegStack");
    expect(uri).toContain(encodeURIComponent("admin@regstack.de"));
  });
});
