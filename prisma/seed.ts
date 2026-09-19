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
      { email: "revision@beispiel-leasing.de", name: "K. Fischer", role: "INTERNE_REVISION" as const },
      { email: "admin@regstack.de", name: "RegStack Admin", role: "ADMIN" as const },
      { email: "risikocontrolling@beispiel-leasing.de", name: "S. Krüger", role: "RISIKOCONTROLLING" as const },
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

  const compliance = users[1];

  // --- Compliance (AT 4.4.2) demo data ---------------------------------------------------

  const quelle = await prisma.quelle.create({
    data: {
      institutionId: institution.id,
      bezeichnung: "BaFin-Rundschreiben & Verlautbarungen",
      bezugsweg: "Newsletter BaFin",
      turnus: "monatlich",
      verantwortlichUserId: compliance.id,
      letzteDurchsicht: new Date("2026-08-01"),
      createdByUserId: compliance.id,
    },
  });

  await prisma.regulatorischeAenderung.create({
    data: {
      institutionId: institution.id,
      quelleId: quelle.id,
      erfasstAm: new Date("2026-07-15"),
      gegenstand: "MaRisk-Novelle AT 9 (BA 54) — Anpassung Auslagerungsmanagement",
      kritikalitaet: "hoch",
      inkrafttreten: "30.06.2026",
      zugewiesenAnUserId: compliance.id,
      disposition: "angewandt",
      createdByUserId: compliance.id,
    },
  });

  const normWesentlich = await prisma.norm.create({
    data: {
      institutionId: institution.id,
      bezeichnung: "§ 25b KWG — Auslagerung von Aktivitäten und Prozessen",
      quelle: "manuell",
      sachgebiet: "Auslagerungsmanagement",
      relevanz: "relevant",
      relevanzBegruendung: "Institut lagert IT-Infrastruktur und Zahlungsabwicklung aus.",
      wesentlichkeit: "wesentlich",
      wesentlichkeitBegruendung: "Betrifft mehrere wesentliche Auslagerungen (Cloud, Zahlungsverkehr).",
      risiko: "hoch",
      status: "in_kraft",
      createdByUserId: compliance.id,
    },
  });
  await prisma.normAssignmentHandshake.create({
    data: {
      institutionId: institution.id,
      normId: normWesentlich.id,
      assignedUserId: geschaeftsleitung.id,
      proposedByUserId: compliance.id,
      status: "bestaetigt",
      confirmedAt: new Date("2026-08-05"),
    },
  });
  await prisma.norm.update({ where: { id: normWesentlich.id }, data: { fachbereichUserId: geschaeftsleitung.id } });

  await prisma.norm.create({
    data: {
      institutionId: institution.id,
      bezeichnung: "Geldwäschegesetz (GwG) — Sorgfaltspflichten",
      quelle: "manuell",
      sachgebiet: "Geldwäscheprävention",
      relevanz: "relevant",
      relevanzBegruendung: "Kundenidentifizierung im Leasinggeschäft.",
      status: "manuell",
      createdByUserId: compliance.id,
    },
  });

  await prisma.feststellung.create({
    data: {
      institutionId: institution.id,
      normId: normWesentlich.id,
      titel: "Vertragscheckliste Tz. 7 unvollständig dokumentiert",
      beschreibung: "Bei Cloud-Hosting fehlt der Nachweis der Informationsrechte der Internen Revision im Vertrag.",
      schweregrad: "mittel",
      frist: new Date("2026-12-31"),
      massnahme: "Vertragsnachtrag mit dem Anbieter abstimmen.",
      quelle: "Kontrolle",
      verantwortlichUserId: compliance.id,
      createdByUserId: compliance.id,
    },
  });
  await prisma.feststellung.create({
    data: {
      institutionId: institution.id,
      normId: normWesentlich.id,
      titel: "Turnusmäßige Überprüfung der Erleichterungen",
      beschreibung: "Nachweis der jährlichen Überprüfung nachgereicht.",
      schweregrad: "gering",
      massnahme: "Termin im Kontrollkalender ergänzt.",
      quelle: "Selbstbewertung",
      verantwortlichUserId: compliance.id,
      status: "geschlossen",
      fachbereichErledigtVon: compliance.id,
      fachbereichErledigtAm: new Date("2026-06-01"),
      wirksamkeitBestaetigtVon: compliance.id,
      wirksamkeitBestaetigtAm: new Date("2026-06-10"),
      geschlossenVon: compliance.id,
      geschlossenAm: new Date("2026-06-10"),
      createdByUserId: compliance.id,
    },
  });

  await prisma.complianceRating.create({
    data: {
      institutionId: institution.id,
      periode: "Q2 2026",
      rating: "gelb",
      begruendung: "Eine offene Feststellung mit mittlerem Schweregrad, Frist eingehalten.",
      erfasstVonUserId: compliance.id,
      erfasstAm: new Date("2026-07-01"),
    },
  });

  await prisma.complianceGovernanceSettings.create({
    data: {
      institutionId: institution.id,
      sonderfallKleinesInstitut: false,
      kombinationRationale: "Compliance-Funktion ist organisatorisch von Markt und Handel getrennt (Tz. 3).",
      ressourcenausstattung: "Eine Vollzeitstelle, angemessen zum Geschäftsumfang.",
      updatedByUserId: geschaeftsleitung.id,
    },
  });

  const finalReport = await prisma.complianceReport.create({
    data: {
      institutionId: institution.id,
      reportType: "quartalsbericht",
      periodFrom: new Date("2026-04-01"),
      periodTo: new Date("2026-06-30"),
      status: "final",
      content: { name: "Quartalsbericht Q2 2026", rating: "gelb", defizite: "Eine offene Feststellung (mittel).", gegenmassnahmen: "Vertragsnachtrag Cloud-Hosting bis Q4 2026." },
      finalizedAt: new Date("2026-07-05"),
      createdByUserId: compliance.id,
    },
  });
  await prisma.complianceReportAcknowledgement.create({
    data: { reportId: finalReport.id, userId: geschaeftsleitung.id },
  });
  await prisma.complianceReport.create({
    data: {
      institutionId: institution.id,
      reportType: "quartalsbericht",
      periodFrom: new Date("2026-07-01"),
      periodTo: new Date("2026-09-30"),
      status: "entwurf",
      content: { name: "Quartalsbericht Q3 2026" },
      createdByUserId: compliance.id,
    },
  });

  const risiko = await prisma.risiko.create({
    data: {
      institutionId: institution.id,
      nr: "R-01",
      bezeichnung: "Verstoß gegen Auslagerungsanforderungen (§ 25b KWG)",
      eintrittswahrscheinlichkeit: "mittel",
      auswirkung: "hoch",
      inhaerent: "hoch",
      kontrollbewertung: "wirksam",
      restrisiko: "mittel",
      massnahme: "Jährliche Vertragsprüfung, Kontrolle der Vertragscheckliste.",
      verantwortlichUserId: compliance.id,
    },
  });
  await prisma.normRisiko.create({ data: { normId: normWesentlich.id, risikoId: risiko.id } });
  const kontrolle = await prisma.kontrolle.create({
    data: {
      institutionId: institution.id,
      normId: normWesentlich.id,
      verfahren: "Jahresprüfung Vertragschecklisten",
      prozess: "Auslagerungsmanagement",
      turnus: "jaehrlich",
      letzteDurchfuehrung: new Date("2026-03-01"),
      naechsteFaelligkeit: new Date("2027-03-01"),
      wirksamkeit: "wirksam",
      verantwortlichUserId: compliance.id,
      autorUserId: compliance.id,
      freigegebenVonUserId: geschaeftsleitung.id,
      freigegebenAm: new Date("2026-03-05"),
    },
  });
  await prisma.risikoKontrolle.create({ data: { risikoId: risiko.id, kontrolleId: kontrolle.id } });

  await prisma.beauftragtenfunktion.create({
    data: {
      institutionId: institution.id,
      funktion: "Compliance-Beauftragte",
      rechtsgrundlage: "§ 25a Abs. 1 KWG, AT 4.4.2",
      inhaberUserId: compliance.id,
      bestelltAm: new Date("2024-01-01"),
      anzeigeAufsicht: true,
    },
  });

  await prisma.beratungSchulung.create({
    data: {
      institutionId: institution.id,
      datum: new Date("2026-05-15"),
      thema: "Schulung Geldwäscheprävention für den Vertrieb",
      adressat: "Vertrieb",
      format: "Präsenzschulung",
      nachweisText: "Teilnehmerliste archiviert (12 Teilnehmer).",
    },
  });

  await prisma.gremienZulieferung.create({
    data: {
      institutionId: institution.id,
      typ: "Gremium",
      bezeichnung: "Sitz im Risikoausschuss",
      grundlage: "Geschäftsordnung Risikoausschuss",
      turnus: "laufend",
      letzterEingang: new Date("2026-08-20"),
    },
  });

  await prisma.ereignis.create({
    data: {
      institutionId: institution.id,
      datum: new Date("2026-06-20"),
      ausloeser: "Markt",
      gegenstand: "Kundenbeschwerde zu Kreditvergabe — Prüfung Non-Compliance-Risiko",
      beteiligung: "Compliance einbezogen",
      votum: "unbedenklich",
    },
  });

  const revision = users[2];

  // --- Interne Revision (AT 4.4.3) demo data ---------------------------------------------------

  const pruefungsobjekt = await prisma.pruefungsobjekt.create({
    data: {
      institutionId: institution.id,
      bezeichnung: "Kreditvergabeprozess Privatkunden",
      bereich: "Marktfolge",
      category: "geschaeftsorganisation",
      materiality: "wesentlich",
      risikokriterien: { potenzial: 4, veraenderung: 3, quellen: 3, manipulation: 2 },
      verantwortlichUserId: geschaeftsleitung.id,
      status: "aktiv",
      lastAuditDate: new Date("2025-09-01"),
      planYear: 2026,
      createdByUserId: revision.id,
    },
  });

  const auditPlan = await prisma.auditPlan.create({
    data: {
      institutionId: institution.id,
      year: 2026,
      content: { kapazitaetPT: 220, adjustments: [] },
      status: "genehmigt",
      submittedByUserId: revision.id,
      submittedAt: new Date("2025-11-15"),
      approvedByUserId: geschaeftsleitung.id,
      approvedAt: new Date("2025-11-20"),
      createdByUserId: revision.id,
    },
  });
  await prisma.auditPlan.create({
    data: {
      institutionId: institution.id,
      year: 2027,
      content: { kapazitaetPT: 230, adjustments: [] },
      status: "eingereicht",
      submittedByUserId: revision.id,
      submittedAt: new Date("2026-08-01"),
      createdByUserId: revision.id,
    },
  });

  const pruefung = await prisma.pruefung.create({
    data: {
      institutionId: institution.id,
      pruefungsobjektId: pruefungsobjekt.id,
      subject: "Prüfung Kreditvergabeprozess 2026",
      periodFrom: new Date("2026-03-01"),
      periodTo: new Date("2026-03-31"),
      status: "laufend",
      durchfuehrung: "intern",
      qsChecklist: [],
      createdByUserId: revision.id,
    },
  });
  await prisma.pruefungZuweisung.create({
    data: { pruefungId: pruefung.id, userId: revision.id, role: "leitung", createdByUserId: revision.id },
  });
  const schritt = await prisma.pruefungsschritt.create({
    data: {
      pruefungId: pruefung.id,
      nummer: 1,
      bereich: "Kreditvergabe",
      risiko: "Fehlerhafte Bonitätsprüfung",
      handlung: "Stichprobenprüfung von Kreditakten",
      beurteilung: "",
      createdByUserId: revision.id,
    },
  });
  await prisma.arbeitspapier.create({
    data: {
      schrittId: schritt.id,
      titel: "Stichprobe Kreditakten Q1 2026",
      typ: "Stichprobendokumentation",
      erstellerUserId: revision.id,
      erstelltAm: new Date("2026-03-15"),
      reviewStatus: "in_arbeit",
      createdByUserId: revision.id,
    },
  });

  await prisma.revisionsfeststellung.create({
    data: {
      institutionId: institution.id,
      pruefungsobjektId: pruefungsobjekt.id,
      pruefungId: pruefung.id,
      titel: "Unvollständige Dokumentation der Bonitätsprüfung",
      beschreibung: "In 3 von 25 geprüften Akten fehlte die vollständige Einkommensdokumentation.",
      schweregrad: "wesentlich",
      status: "offen",
      verantwortlichUserId: geschaeftsleitung.id,
      fristUrspruenglich: new Date("2026-12-31"),
      executiveTarget: false,
      createdByUserId: revision.id,
    },
  });

  await prisma.revisionEinstellungen.create({
    data: {
      institutionId: institution.id,
      orgForm: "eigene_einheit",
      headOfAuditUserId: revision.id,
      directSubordination: true,
      independenceConfirmed: true,
      angemesseneZeitTage: 90,
      qsIntervallMonate: 12,
      risikoReviewIntervallMonate: 12,
      updatedByUserId: revision.id,
    },
  });

  await prisma.revisionPersonal.create({
    data: {
      institutionId: institution.id,
      userId: revision.id,
      qualifikation: "Bankkaufmann, CIA-Zertifizierung",
      sollFortbildungTage: 5,
      advisoryActive: false,
      updatedByUserId: revision.id,
    },
  });

  const risikocontrolling = users[4];

  // --- Risikomanagement (MaRisk AT 4) demo data -------------------------------------------------
  // Story und Zahlen sind bewusst deckungsgleich mit dem UI-Prototyp aus
  // Risikomanagement_BAIT_MVP_Spezifikation.md, damit Cockpit-Mockup und API dieselbe Demo erzählen.

  await Promise.all(
    [
      {
        jahr: 2026,
        kategorie: "ADRESSENAUSFALLRISIKO" as const,
        bezeichnung: "Kreditportfolio Firmenkunden & Gewerbeimmobilien",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-11-01"),
        naechsteUeberpruefung: new Date("2026-11-01"),
      },
      {
        jahr: 2026,
        kategorie: "MARKTPREISRISIKO_ANLAGEBUCH" as const,
        bezeichnung: "Zinsänderungsrisiko im Bankbuch",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-09-01"),
        naechsteUeberpruefung: new Date("2026-09-01"),
      },
      {
        jahr: 2026,
        kategorie: "MARKTPREISRISIKO_HANDELSBUCH" as const,
        bezeichnung: "Kein Handelsbuchinstitut",
        wesentlichkeit: "nicht_wesentlich" as const,
        begruendung: "Institut führt kein Handelsbuch (§ 1 Abs. 12 KWG).",
        naechsteUeberpruefung: new Date("2026-09-01"),
      },
      {
        jahr: 2026,
        kategorie: "LIQUIDITAETSRISIKO" as const,
        bezeichnung: "Refinanzierungs- und Einlagenstruktur",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-09-01"),
        naechsteUeberpruefung: new Date("2026-09-01"),
      },
      {
        jahr: 2026,
        kategorie: "OPERATIONELLES_RISIKO" as const,
        bezeichnung: "IT-, Prozess- und Auslagerungsrisiken",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-12-01"),
        naechsteUeberpruefung: new Date("2026-12-01"),
      },
      {
        jahr: 2026,
        kategorie: "KONZENTRATIONSRISIKO" as const,
        bezeichnung: "Branchenkonzentration Bauwirtschaft",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-11-01"),
        naechsteUeberpruefung: new Date("2026-11-01"),
      },
      {
        jahr: 2026,
        kategorie: "ESG_RISIKO" as const,
        bezeichnung: "Transitionsrisiko im Kreditportfolio",
        wesentlichkeit: "wesentlich" as const,
        verantwortlichUserId: risikocontrolling.id,
        letzteUeberpruefung: new Date("2025-06-01"),
        naechsteUeberpruefung: new Date("2026-06-01"), // bewusst bereits fällig, für die Dashboard-Warnung
      },
      {
        jahr: 2026,
        kategorie: "SONSTIGES_RISIKO" as const,
        bezeichnung: "Reputationsrisiko",
        wesentlichkeit: "nicht_wesentlich" as const,
        verantwortlichUserId: compliance.id,
        letzteUeberpruefung: new Date("2025-11-01"),
        naechsteUeberpruefung: new Date("2026-11-01"),
      },
    ].map((data) => prisma.risikoinventur.create({ data: { institutionId: institution.id, createdByUserId: risikocontrolling.id, ...data } }))
  );

  await prisma.risikostrategie.create({
    data: {
      institutionId: institution.id,
      art: "geschaeftsstrategie",
      jahr: 2026,
      inhalt: { schwerpunkte: "Wachstum Firmenkundenleasing, Digitalisierung Antragsstrecke" },
      status: "verabschiedet",
      verabschiedetAm: new Date("2025-12-10"),
      verabschiedetVonUserId: geschaeftsleitung.id,
      naechsteUeberpruefung: new Date("2026-12-10"),
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.risikostrategie.create({
    data: {
      institutionId: institution.id,
      art: "risikostrategie",
      jahr: 2026,
      inhalt: { konsistenzGeschaeftsstrategie: "geprüft, keine Abweichungen" },
      status: "verabschiedet",
      verabschiedetAm: new Date("2025-12-10"),
      verabschiedetVonUserId: geschaeftsleitung.id,
      naechsteUeberpruefung: new Date("2026-12-10"),
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.risikostrategie.create({
    data: {
      institutionId: institution.id,
      art: "teilstrategie",
      jahr: 2025,
      inhalt: { bezeichnung: "Teilstrategie Kreditrisiko 2025" },
      status: "verabschiedet",
      verabschiedetAm: new Date("2025-03-01"),
      verabschiedetVonUserId: geschaeftsleitung.id,
      naechsteUeberpruefung: new Date("2026-03-01"), // bereits überfällig — Dashboard-Warnung
      createdByUserId: risikocontrolling.id,
    },
  });

  await prisma.risikotragfaehigkeit.create({
    data: {
      institutionId: institution.id,
      periode: "2026-Q1",
      ansatz: "oekonomisch",
      risikodeckungspotenzial: 128_500_000,
      limits: {
        ADRESSENAUSFALLRISIKO: { limitProzent: 100, auslastungProzent: 62 },
        MARKTPREISRISIKO_ANLAGEBUCH: { limitProzent: 100, auslastungProzent: 78 },
        LIQUIDITAETSRISIKO: { limitProzent: 100, auslastungProzent: 54 },
        OPERATIONELLES_RISIKO: { limitProzent: 100, auslastungProzent: 88 },
        KONZENTRATIONSRISIKO: { limitProzent: 100, auslastungProzent: 96 },
      },
      auslastungGesamt: 71,
      ergebnis: "Risikodeckungspotenzial deckt alle wesentlichen Risiken; Konzentrationsrisiko nahe Limit.",
      methodenpruefungAm: new Date("2026-01-15"),
      freigegebenVonUserId: risikocontrolling.id,
      freigegebenAm: new Date("2026-04-05"),
      createdByUserId: risikocontrolling.id,
    },
  });

  await prisma.rmReport.create({
    data: {
      institutionId: institution.id,
      reportType: "quartalsbericht",
      periodFrom: new Date("2026-01-01"),
      periodTo: new Date("2026-03-31"),
      status: "entwurf",
      content: {
        kapitalausstattung: "Risikodeckungspotenzial deckt alle wesentlichen Risiken. Konzentrationsrisiko nahe Limit, Gegenmaßnahme eingeleitet.",
        risikolage: "Keine wesentlichen Änderungen im Berichtszeitraum. ESG-Risikobewertung wird zum 06/2026 aktualisiert.",
        massnahmen: "Limitanpassung Branchenkonzentration Bauwirtschaft in Abstimmung mit dem Kreditrisikocontrolling, Umsetzung bis 05/2026.",
      },
      createdByUserId: risikocontrolling.id,
    },
  });

  // --- IT-Risikomanagement / BAIT demo data -----------------------------------------------------

  const itStrategie2026 = await prisma.itStrategie.create({
    data: {
      institutionId: institution.id,
      jahr: 2026,
      inhalt: { schwerpunkte: "Cloud-Migration Kernbankverfahren, Ausbau Informationssicherheit" },
      status: "verabschiedet",
      verabschiedetAm: new Date("2026-01-20"),
      verabschiedetVonUserId: geschaeftsleitung.id,
      konsistenzpruefungGeschaeftsstrategie: "Durchgeführt, keine Abweichungen zur Geschäftsstrategie 2026.",
      naechsteUeberpruefung: new Date("2027-01-20"),
      createdByUserId: risikocontrolling.id,
    },
  });

  const [kernbankverfahren, kreditvergabesystem, firmenkundenportal, netzwerkRz, backupRz] = await Promise.all([
    prisma.itAsset.create({
      data: {
        institutionId: institution.id,
        bezeichnung: "Kernbankverfahren",
        kategorie: "it_system",
        eigentuemerUserId: risikocontrolling.id,
        schutzbedarfVertraulichkeit: "sehr_hoch",
        schutzbedarfIntegritaet: "sehr_hoch",
        schutzbedarfVerfuegbarkeit: "sehr_hoch",
        begruendung: "Träger sämtlicher Kernbankprozesse, Ausfall unterbricht das gesamte Bankgeschäft.",
        letzteUeberpruefung: new Date("2026-01-10"),
        naechsteUeberpruefung: new Date("2027-01-10"),
        createdByUserId: risikocontrolling.id,
      },
    }),
    prisma.itAsset.create({
      data: {
        institutionId: institution.id,
        bezeichnung: "Kreditvergabesystem",
        kategorie: "anwendung",
        eigentuemerUserId: risikocontrolling.id,
        schutzbedarfVertraulichkeit: "hoch",
        schutzbedarfIntegritaet: "hoch",
        schutzbedarfVerfuegbarkeit: "hoch",
        letzteUeberpruefung: new Date("2026-01-10"),
        naechsteUeberpruefung: new Date("2027-01-10"),
        createdByUserId: risikocontrolling.id,
      },
    }),
    prisma.itAsset.create({
      data: {
        institutionId: institution.id,
        bezeichnung: "Firmenkundenportal",
        kategorie: "anwendung",
        eigentuemerUserId: compliance.id,
        schutzbedarfVertraulichkeit: "hoch",
        schutzbedarfIntegritaet: "hoch",
        schutzbedarfVerfuegbarkeit: "normal",
        letzteUeberpruefung: new Date("2026-01-10"),
        naechsteUeberpruefung: new Date("2027-01-10"),
        createdByUserId: risikocontrolling.id,
      },
    }),
    prisma.itAsset.create({
      data: {
        institutionId: institution.id,
        bezeichnung: "Netzwerkinfrastruktur Rechenzentrum",
        kategorie: "netzwerk",
        eigentuemerUserId: risikocontrolling.id,
        schutzbedarfVertraulichkeit: "hoch",
        schutzbedarfIntegritaet: "sehr_hoch",
        schutzbedarfVerfuegbarkeit: "sehr_hoch",
        letzteUeberpruefung: new Date("2026-01-10"),
        naechsteUeberpruefung: new Date("2027-01-10"),
        createdByUserId: risikocontrolling.id,
      },
    }),
    prisma.itAsset.create({
      data: {
        institutionId: institution.id,
        bezeichnung: "Backup-Rechenzentrum",
        kategorie: "rechenzentrum",
        eigentuemerUserId: risikocontrolling.id,
        schutzbedarfVertraulichkeit: "normal",
        schutzbedarfIntegritaet: "hoch",
        schutzbedarfVerfuegbarkeit: "sehr_hoch",
        letzteUeberpruefung: new Date("2026-01-10"),
        naechsteUeberpruefung: new Date("2027-01-10"),
        createdByUserId: risikocontrolling.id,
      },
    }),
  ]);
  await prisma.itAsset.create({
    data: {
      institutionId: institution.id,
      bezeichnung: "E-Mail & Kommunikation",
      kategorie: "anwendung",
      eigentuemerUserId: compliance.id,
      schutzbedarfVertraulichkeit: "normal",
      schutzbedarfIntegritaet: "normal",
      schutzbedarfVerfuegbarkeit: "hoch",
      letzteUeberpruefung: new Date("2026-01-10"),
      naechsteUeberpruefung: new Date("2027-01-10"),
      createdByUserId: risikocontrolling.id,
    },
  });

  await prisma.itRisiko.create({
    data: {
      institutionId: institution.id,
      assetId: firmenkundenportal.id,
      bedrohung: "Unbefugter Zugriff durch veraltete Berechtigungen",
      eintrittswahrscheinlichkeit: "mittel",
      auswirkung: "hoch",
      bruttorisiko: "hoch",
      massnahme: "Rezertifizierung der Portal-Berechtigungen, Einführung eines regelmäßigen Reviews.",
      restrisiko: "hoch",
      status: "offen",
      verantwortlichUserId: risikocontrolling.id,
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.itRisiko.create({
    data: {
      institutionId: institution.id,
      assetId: kernbankverfahren.id,
      bedrohung: "Ausfall des Kernbankverfahrens durch Kapazitätsengpass",
      eintrittswahrscheinlichkeit: "mittel",
      auswirkung: "hoch",
      bruttorisiko: "hoch",
      massnahme: "Kapazitätsmonitoring und Skalierungsplan mit dem Anbieter abstimmen.",
      restrisiko: "mittel",
      status: "offen",
      verantwortlichUserId: risikocontrolling.id,
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.itRisiko.create({
    data: {
      institutionId: institution.id,
      assetId: kreditvergabesystem.id,
      bedrohung: "Ransomware-Angriff über eine Drittanbieter-Schnittstelle",
      eintrittswahrscheinlichkeit: "mittel",
      auswirkung: "kritisch",
      bruttorisiko: "kritisch",
      massnahme: "Netzsegmentierung der Schnittstelle, verschärftes Patch-Management beim Drittanbieter.",
      restrisiko: "mittel",
      status: "in_bearbeitung",
      verantwortlichUserId: risikocontrolling.id,
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.itRisiko.create({
    data: {
      institutionId: institution.id,
      assetId: backupRz.id,
      bedrohung: "Datenverlust durch unvollständige Datensicherung",
      eintrittswahrscheinlichkeit: "gering",
      auswirkung: "hoch",
      bruttorisiko: "mittel",
      massnahme: "Backup-Verifikation automatisiert, wöchentlicher Restore-Test eingeführt.",
      restrisiko: "gering",
      status: "geschlossen",
      verantwortlichUserId: risikocontrolling.id,
      createdByUserId: risikocontrolling.id,
    },
  });

  await prisma.itSicherheitsvorfall.create({
    data: {
      institutionId: institution.id,
      datum: new Date("2026-03-02"),
      kategorie: "Verfügbarkeit",
      schweregrad: "hoch",
      beschreibung: "Kurzzeitiger Ausfall des Kernbankverfahrens durch einen Kapazitätsengpass im Rechenzentrum.",
      betroffeneSysteme: "Kernbankverfahren, Netzwerkinfrastruktur Rechenzentrum",
      eskalationAnUserId: geschaeftsleitung.id,
      meldepflichtBaFin: true,
      meldedatumBaFin: new Date("2026-03-03"),
      status: "in_bearbeitung",
      massnahme: "Kapazitätserweiterung beauftragt, Monitoring-Schwellenwerte angepasst.",
      createdByUserId: risikocontrolling.id,
    },
  });
  await prisma.itSicherheitsvorfall.create({
    data: {
      institutionId: institution.id,
      datum: new Date("2026-03-14"),
      kategorie: "Social Engineering",
      schweregrad: "mittel",
      beschreibung: "Phishing-Kampagne gegen Nutzer:innen des Firmenkundenportals.",
      betroffeneSysteme: "Firmenkundenportal",
      eskalationAnUserId: risikocontrolling.id,
      meldepflichtBaFin: false,
      status: "geschlossen",
      massnahme: "Betroffene Zugänge gesperrt, Awareness-Hinweis an alle Nutzer:innen versendet.",
      abschlussAm: new Date("2026-03-18"),
      abschlussVonUserId: risikocontrolling.id,
      createdByUserId: risikocontrolling.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded institution ${institution.name} with 3 activities (first: ${cloudHosting.id}), Compliance, Interne Revision, Risikomanagement, and IT-Risiko/BAIT (IT-Strategie ${itStrategie2026.jahr} verabschiedet) demo data.`
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
