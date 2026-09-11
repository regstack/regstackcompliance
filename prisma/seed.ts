// Seed data intentionally mirrors the fictional example items in regstack_cockpit.html (Anbieter
// A-E, "Beispiel Leasing AG") — same story, same numbers, so a demo told from the prototype and a
// demo told from this API agree with each other.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const institution = await prisma.institutionProfile.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Beispiel Leasing AG (Musterdaten)",
      sizeClass: "KLEIN",
      calculationModel: "CSC",
      cscMaterialityThreshold: 2.5,
      cscImpactThreshold: 2.75,
      revisionsbeauftragterName: null,
    },
  });

  const passwordHash = await bcrypt.hash("regstack-dev-2026", 10);
  const users = await Promise.all(
    [
      { email: "geschaeftsleitung@beispiel-leasing.de", name: "J. Bauer", role: "GESCHAEFTSLEITUNG" as const },
      { email: "compliance@beispiel-leasing.de", name: "M. Winter", role: "COMPLIANCE" as const },
      { email: "admin@regstack.de", name: "RegStack Admin", role: "ADMIN" as const },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, institutionId: institution.id, passwordHash },
      })
    )
  );
  const geschaeftsleitung = users[0];

  // 1) Cloud-Hosting Kernanwendungen — CSC-Modell, beide Schwellen überschritten, kein Hard-Trigger
  const cloudHosting = await prisma.outsourcingActivity.create({
    data: {
      institutionId: institution.id,
      name: "Cloud-Hosting Kernanwendungen",
      category: "IT-Infrastruktur & Cloud",
      provider: "Anbieter A (Hyperscaler, EU-Region)",
      scope: "AUSLAGERUNG",
      isCloud: true,
      isSubOutsourcing: true,
      dataCategories: "Vertrags-, Kunden- und Zahlungsdaten",
      serviceLocations: "EU (Frankfurt, Dublin)",
      status: "AKTIV",
      riskAnalysis: {
        create: {
          materialityRatings: { m1: 4, m2: 3, m3: 3, m4: 4, m5: 3, m6: 3 },
          secondDimensionRatings: { ei1: 3, ei2: 3, ei3: 3, ei4: 3, ei5: 3, ei6: 2 },
          materialityScore: 3.33,
          secondScore: 2.83,
          inherentScore: 3.08,
          computedMaterial: true,
          criticalSuggestion: false,
          materiality: true,
          criticality: "NICHT_KRITISCH",
          criticalityReason: "Redundante Auslegung über zwei Regionen; kein Einzelpunkt für Kernbankprozesse.",
          classifiedByUserId: geschaeftsleitung.id,
          classifiedAt: new Date(),
        },
      },
      handlungsoption: {
        create: {
          status: "ADOPTED_OPTIONS",
          ersetzbarkeit: "SCHWIERIG",
          transitionMonths: 9,
          reviewDate: new Date("2027-01-15"),
        },
      },
      contract: { create: { clauseChecklist: { g: "OFFEN" } } },
      monitoringRecords: {
        create: [
          {
            type: "EVIDENCE_LOG",
            evidenceDate: new Date("2026-02-01"),
            evidenceDescription: "SOC 2 Type II — Bridge Letter 03/2026 deckt 02.2025–01.2026 ab.",
            reviewedByUserId: users[1].id,
            reviewedAt: new Date("2026-03-10"),
          },
        ],
      },
    },
  });

  // 2) Zahlungsabwicklung — Hard-Trigger (t2), automatisch wesentlich + kritisch
  await prisma.outsourcingActivity.create({
    data: {
      institutionId: institution.id,
      name: "Zahlungsabwicklung (Karten & Lastschrift)",
      category: "Zahlungsverkehr",
      provider: "Anbieter C (Zahlungsdienstleister, konzernweit genutzt)",
      scope: "AUSLAGERUNG",
      groupInternal: true,
      dataCategories: "Zahlungsdaten, Kontodaten",
      serviceLocations: "Niederlande",
      deepDive: true,
      status: "AKTIV",
      riskAnalysis: {
        create: {
          quickTriggers: { t2: true },
          materialityRatings: { m1: 4, m2: 5, m3: 4, m4: 4, m5: 4, m6: 3 },
          secondDimensionRatings: { ei1: 5, ei2: 4, ei3: 5, ei4: 4, ei5: 4, ei6: 4 },
          materialityScore: 4.17,
          secondScore: 4.33,
          inherentScore: 4.25,
          computedMaterial: true,
          criticalSuggestion: true,
          materiality: true,
          criticality: "KRITISCH",
          criticalityReason: "Ausfall unterbricht sämtliche Kundenzahlungen; keine kurzfristige Alternative am Markt.",
          classifiedByUserId: geschaeftsleitung.id,
          classifiedAt: new Date(),
        },
      },
      handlungsoption: {
        create: {
          status: "BCM_LINKED",
          ersetzbarkeit: "UNMOEGLICH",
          transitionMonths: 18,
          reviewDate: new Date("2027-02-20"),
          depApprover: "J. Bauer (Geschäftsführung)",
          depDate: new Date("2026-02-20"),
          depControls:
            "Vertragliches Kündigungsrecht (3 Monate); Eskalationsklausel bei Serviceausfall; konzernweite Steuerung; im BCM als Szenario 'Zahlungsdienstleister-Ausfall' hinterlegt.",
        },
      },
      contract: { create: { clauseChecklist: { f: "NICHT_ERFORDERLICH" } } },
    },
  });

  // 3) Personalabrechnung — unterhalb beider CSC-Schwellen, nicht wesentlich
  await prisma.outsourcingActivity.create({
    data: {
      institutionId: institution.id,
      name: "Personalabrechnung",
      category: "HR & Personalabrechnung",
      provider: "Anbieter E (Lohnbüro)",
      scope: "AUSLAGERUNG",
      dataCategories: "Personaldaten",
      serviceLocations: "Deutschland",
      status: "AKTIV",
      riskAnalysis: {
        create: {
          materialityRatings: { m1: 2, m2: 2, m3: 1, m4: 3, m5: 2, m6: 1 },
          secondDimensionRatings: { ei1: 1, ei2: 2, ei3: 1, ei4: 2, ei5: 1, ei6: 1 },
          materialityScore: 1.83,
          secondScore: 1.33,
          inherentScore: 1.58,
          computedMaterial: false,
          criticalSuggestion: false,
          materiality: false,
          criticality: "NICHT_KRITISCH",
          criticalityReason: "Geringe Auswirkung auf Bankgeschäft; Rückverlagerung kurzfristig möglich.",
          classifiedByUserId: geschaeftsleitung.id,
          classifiedAt: new Date(),
        },
      },
      handlungsoption: {
        create: { status: "ADOPTED_OPTIONS", ersetzbarkeit: "LEICHT", transitionMonths: 3, reviewDate: new Date("2027-04-01") },
      },
      contract: { create: { clauseChecklist: {} } },
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded institution ${institution.name} with 3 activities (first: ${cloudHosting.id}).`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
