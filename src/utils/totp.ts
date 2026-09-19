import { OTP } from "otplib";

const totp = new OTP({ strategy: "totp" });

export function generateTotpSecret(): string {
  return totp.generateSecret();
}

export function totpKeyUri(email: string, secret: string): string {
  return totp.generateURI({ issuer: "RegStack", label: email, secret });
}

// ±1 time step (±30s) tolerance for clock drift between server and authenticator app — matches
// the window most authenticator apps themselves tolerate.
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const result = await totp.verify({ secret, token: code, epochTolerance: [1, 1] });
  return result.valid;
}
