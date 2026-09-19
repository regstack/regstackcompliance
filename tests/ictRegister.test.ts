import { describe, expect, it } from "vitest";
import { arrangementSchema } from "../src/modules/ictRegister/arrangements.routes";

describe("arrangementSchema — DORA Art. 28(3) criticality justification", () => {
  const base = { providerId: "p1", functionDescription: "Cloud-Hosting der Kernbankanwendung" };

  it("accepts a non-critical arrangement without a reason", () => {
    expect(arrangementSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a critical arrangement without a reason", () => {
    const result = arrangementSchema.safeParse({ ...base, supportsCriticalFunction: true });
    expect(result.success).toBe(false);
  });

  it("accepts a critical arrangement once a reason is given", () => {
    const result = arrangementSchema.safeParse({
      ...base,
      supportsCriticalFunction: true,
      criticalityReason: "Trägt die Kernbankanwendung, kein Ausweichanbieter kurzfristig verfügbar",
    });
    expect(result.success).toBe(true);
  });
});
