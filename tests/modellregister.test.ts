import { describe, expect, it } from "vitest";
import { modellSchema } from "../src/modules/risikomanagement/modellregister.routes";

describe("modellSchema — AT 4.3.4 Modellregister", () => {
  const base = { bezeichnung: "Scoring-Modell Kreditvergabe", zweck: "Bonitätsprüfung im Retail-Neugeschäft" };

  it("accepts the minimal required fields and applies defaults", () => {
    const result = modellSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.istKiBasiert).toBe(false);
      expect(result.data.status).toBe("in_entwicklung");
    }
  });

  it("rejects a missing bezeichnung or zweck", () => {
    expect(modellSchema.safeParse({ zweck: "x" }).success).toBe(false);
    expect(modellSchema.safeParse({ bezeichnung: "x" }).success).toBe(false);
  });

  it("rejects an unknown status value", () => {
    const result = modellSchema.safeParse({ ...base, status: "irgendwas" });
    expect(result.success).toBe(false);
  });

  it("accepts a KI-basiertes model with validation and explainability fields", () => {
    const result = modellSchema.safeParse({
      ...base,
      istKiBasiert: true,
      status: "aktiv",
      letzteValidierung: "2026-01-15T00:00:00.000Z",
      naechsteValidierung: "2027-01-15T00:00:00.000Z",
      validierungsergebnis: "Bestanden, keine Auffälligkeiten",
      erklaerbarkeitBewertung: "SHAP-Werte je Feature dokumentiert",
      ueberschreibungenBeschreibung: "Manuelles Vier-Augen-Override bei Grenzfällen",
    });
    expect(result.success).toBe(true);
  });

  it("accepts explicit null for the optional nullable fields", () => {
    const result = modellSchema.safeParse({
      ...base,
      verantwortlichUserId: null,
      letzteValidierung: null,
      naechsteValidierung: null,
    });
    expect(result.success).toBe(true);
  });
});
