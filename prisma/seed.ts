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
      { email: "risikocontrolling@beispiel-leasing.de", name: "T. Neumann", role: "RISIKOCONTROLLING" as const },
      { email: "buchhaltung@beispiel-leasing.de", name: "S. Krüger", role: "BUCHHALTUNG" as const },
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

  const risikocontrolling = users[3];
  const buchhaltung = users[4];

  // Externe Prüfung 2025 — bereits von der GL zur Kenntnis genommen, drei Feststellungen in
  // unterschiedlichen Bearbeitungsständen, damit das Register den vollen Workflow zeigt statt nur
  // "offen".
  const externePruefung2025 = await prisma.externePruefung.create({
    data: {
      institutionId: institution.id,
      pruefer: "Wirtschaftsprüfungsgesellschaft Mustermann & Partner",
      jahr: 2025,
      berichtsdatum: new Date("2026-02-10"),
      glKenntnisnahmeByUserId: geschaeftsleitung.id,
      glKenntnisnahmeAt: new Date("2026-02-17"),
      createdByUserId: revision.id,
    },
  });
  await prisma.externePruefungFeststellung.create({
    data: {
      institutionId: institution.id,
      externePruefungId: externePruefung2025.id,
      titel: "Nachweisführung bei Weiterverlagerungen unvollständig",
      beschreibung: "Bei 2 von 8 geprüften Weiterverlagerungen fehlte die schriftliche Zustimmung des Instituts.",
      schweregrad: "mittel",
      modul: "OUTSOURCING",
      frist: new Date("2026-05-31"),
      verantwortlichUserId: compliance.id,
      status: "geschlossen",
      verteiltAm: new Date("2026-02-20"),
      verteiltVon: revision.id,
      fachbereichErledigtAm: new Date("2026-04-02"),
      fachbereichErledigtVon: compliance.id,
      wirksamkeitBestaetigtAm: new Date("2026-04-15"),
      wirksamkeitBestaetigtVon: revision.id,
      geschlossenAm: new Date("2026-04-15"),
      geschlossenVon: revision.id,
      createdByUserId: revision.id,
    },
  });
  await prisma.externePruefungFeststellung.create({
    data: {
      institutionId: institution.id,
      externePruefungId: externePruefung2025.id,
      titel: "Berechtigungskonzept IT nicht turnusmäßig überprüft",
      beschreibung: "Die letzte Rezertifizierung der IT-Berechtigungen liegt über 18 Monate zurück.",
      schweregrad: "wesentlich",
      fachbereich: "IT",
      frist: new Date("2026-06-30"),
      verantwortlichUserId: risikocontrolling.id,
      status: "wirksamkeit_bestaetigt",
      verteiltAm: new Date("2026-02-20"),
      verteiltVon: revision.id,
      fachbereichErledigtAm: new Date("2026-05-05"),
      fachbereichErledigtVon: risikocontrolling.id,
      wirksamkeitBestaetigtAm: new Date("2026-05-20"),
      wirksamkeitBestaetigtVon: revision.id,
      createdByUserId: revision.id,
    },
  });
  await prisma.externePruefungFeststellung.create({
    data: {
      institutionId: institution.id,
      externePruefungId: externePruefung2025.id,
      titel: "Kontrolltests IKS nicht vollständig dokumentiert",
      beschreibung: "Testdurchführung nachvollziehbar, aber ohne durchgängige Stichprobendokumentation.",
      schweregrad: "gering",
      modul: "COMPLIANCE",
      frist: new Date("2026-06-15"),
      verantwortlichUserId: compliance.id,
      status: "fachbereich_erledigt",
      verteiltAm: new Date("2026-02-20"),
      verteiltVon: revision.id,
      fachbereichErledigtAm: new Date("2026-05-30"),
      fachbereichErledigtVon: compliance.id,
      createdByUserId: revision.id,
    },
  });

  // Externe Prüfung 2026 — frisch erfasst, GL-Kenntnisnahme und Feststellung noch offen: das ist
  // der aktive Eintrag, den das GL-Dashboard als ausstehende Aufgabe anzeigen soll.
  const externePruefung2026 = await prisma.externePruefung.create({
    data: {
      institutionId: institution.id,
      pruefer: "Wirtschaftsprüfungsgesellschaft Mustermann & Partner",
      jahr: 2026,
      berichtsdatum: new Date("2026-03-20"),
      createdByUserId: revision.id,
    },
  });
  await prisma.externePruefungFeststellung.create({
    data: {
      institutionId: institution.id,
      externePruefungId: externePruefung2026.id,
      titel: "Fristüberwachung bei Vertragsverlängerungen im Auslagerungsregister",
      beschreibung: "Zwei Verträge wurden ohne dokumentierte Verlängerungsprüfung automatisch verlängert.",
      schweregrad: "mittel",
      modul: "OUTSOURCING",
      frist: new Date("2026-09-30"),
      verantwortlichUserId: compliance.id,
      status: "offen",
      verteiltAm: new Date("2026-03-25"),
      verteiltVon: revision.id,
      createdByUserId: revision.id,
    },
  });

  // --- Accounting / Buchhaltung demo data -------------------------------------------------
  // Three fiscal years so the dashboard's period-over-period analysis has something to show;
  // 2024/2025 are finalized (2024 also signed off by Geschäftsleitung), 2026 is still a draft.

  const bilanz2024 = await prisma.balanceSheet.upsert({
    where: { id: "20000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000001",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2024,
      periodLabel: "Geschäftsjahr 2024",
      status: "final",
      finalizedAt: new Date("2025-03-15"),
      lineItems: {
        create: [
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Leasingvermögen", currentAmount: 42_000_000, priorYearAmount: 38_000_000, sortOrder: 1 },
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Sachanlagen", currentAmount: 1_200_000, priorYearAmount: 1_100_000, sortOrder: 2 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Forderungen aus Leasingverträgen", currentAmount: 8_500_000, priorYearAmount: 7_800_000, sortOrder: 3 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Kassenbestand, Guthaben bei Kreditinstituten", currentAmount: 3_200_000, priorYearAmount: 2_900_000, sortOrder: 4 },
          { side: "AKTIVA", section: "RECHNUNGSABGRENZUNG_AKTIVA", label: "Aktive Rechnungsabgrenzung", currentAmount: 450_000, priorYearAmount: 400_000, sortOrder: 5 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gezeichnetes Kapital", currentAmount: 5_000_000, priorYearAmount: 5_000_000, sortOrder: 1 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gewinnrücklagen", currentAmount: 6_200_000, priorYearAmount: 5_400_000, sortOrder: 2 },
          { side: "PASSIVA", section: "RUECKSTELLUNGEN", label: "Rückstellungen für Risiken", currentAmount: 1_800_000, priorYearAmount: 1_600_000, sortOrder: 3 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten gegenüber Kreditinstituten", currentAmount: 38_500_000, priorYearAmount: 35_200_000, sortOrder: 4 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten aus Lieferungen und Leistungen", currentAmount: 3_100_000, priorYearAmount: 2_800_000, sortOrder: 5 },
          { side: "PASSIVA", section: "RECHNUNGSABGRENZUNG_PASSIVA", label: "Passive Rechnungsabgrenzung", currentAmount: 750_000, priorYearAmount: 680_000, sortOrder: 6 },
        ],
      },
    },
  });
  await prisma.accountingSignOff.upsert({
    where: { documentType_documentId_userId: { documentType: "BILANZ", documentId: bilanz2024.id, userId: geschaeftsleitung.id } },
    update: {},
    create: { institutionId: institution.id, documentType: "BILANZ", documentId: bilanz2024.id, userId: geschaeftsleitung.id },
  });

  await prisma.balanceSheet.upsert({
    where: { id: "20000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000002",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2025,
      periodLabel: "Geschäftsjahr 2025",
      status: "final",
      finalizedAt: new Date("2026-03-14"),
      lineItems: {
        create: [
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Leasingvermögen", currentAmount: 46_800_000, priorYearAmount: 42_000_000, sortOrder: 1 },
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Sachanlagen", currentAmount: 1_350_000, priorYearAmount: 1_200_000, sortOrder: 2 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Forderungen aus Leasingverträgen", currentAmount: 9_600_000, priorYearAmount: 8_500_000, sortOrder: 3 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Kassenbestand, Guthaben bei Kreditinstituten", currentAmount: 3_850_000, priorYearAmount: 3_200_000, sortOrder: 4 },
          { side: "AKTIVA", section: "RECHNUNGSABGRENZUNG_AKTIVA", label: "Aktive Rechnungsabgrenzung", currentAmount: 500_000, priorYearAmount: 450_000, sortOrder: 5 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gezeichnetes Kapital", currentAmount: 5_000_000, priorYearAmount: 5_000_000, sortOrder: 1 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gewinnrücklagen", currentAmount: 7_450_000, priorYearAmount: 6_200_000, sortOrder: 2 },
          { side: "PASSIVA", section: "RUECKSTELLUNGEN", label: "Rückstellungen für Risiken", currentAmount: 2_100_000, priorYearAmount: 1_800_000, sortOrder: 3 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten gegenüber Kreditinstituten", currentAmount: 43_200_000, priorYearAmount: 38_500_000, sortOrder: 4 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten aus Lieferungen und Leistungen", currentAmount: 3_450_000, priorYearAmount: 3_100_000, sortOrder: 5 },
          { side: "PASSIVA", section: "RECHNUNGSABGRENZUNG_PASSIVA", label: "Passive Rechnungsabgrenzung", currentAmount: 900_000, priorYearAmount: 750_000, sortOrder: 6 },
        ],
      },
    },
  });

  await prisma.balanceSheet.upsert({
    where: { id: "20000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000003",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2026,
      periodLabel: "Geschäftsjahr 2026 (laufend)",
      status: "entwurf",
      lineItems: {
        create: [
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Leasingvermögen", currentAmount: 49_500_000, priorYearAmount: 46_800_000, sortOrder: 1 },
          { side: "AKTIVA", section: "ANLAGEVERMOEGEN", label: "Sachanlagen", currentAmount: 1_300_000, priorYearAmount: 1_350_000, sortOrder: 2 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Forderungen aus Leasingverträgen", currentAmount: 10_800_000, priorYearAmount: 9_600_000, sortOrder: 3 },
          { side: "AKTIVA", section: "UMLAUFVERMOEGEN", label: "Kassenbestand, Guthaben bei Kreditinstituten", currentAmount: 4_100_000, priorYearAmount: 3_850_000, sortOrder: 4 },
          { side: "AKTIVA", section: "RECHNUNGSABGRENZUNG_AKTIVA", label: "Aktive Rechnungsabgrenzung", currentAmount: 520_000, priorYearAmount: 500_000, sortOrder: 5 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gezeichnetes Kapital", currentAmount: 5_000_000, priorYearAmount: 5_000_000, sortOrder: 1 },
          { side: "PASSIVA", section: "EIGENKAPITAL", label: "Gewinnrücklagen", currentAmount: 8_900_000, priorYearAmount: 7_450_000, sortOrder: 2 },
          { side: "PASSIVA", section: "RUECKSTELLUNGEN", label: "Rückstellungen für Risiken", currentAmount: 3_400_000, priorYearAmount: 2_100_000, sortOrder: 3 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten gegenüber Kreditinstituten", currentAmount: 45_100_000, priorYearAmount: 43_200_000, sortOrder: 4 },
          { side: "PASSIVA", section: "VERBINDLICHKEITEN", label: "Verbindlichkeiten aus Lieferungen und Leistungen", currentAmount: 2_850_000, priorYearAmount: 3_450_000, sortOrder: 5 },
          { side: "PASSIVA", section: "RECHNUNGSABGRENZUNG_PASSIVA", label: "Passive Rechnungsabgrenzung", currentAmount: 970_000, priorYearAmount: 900_000, sortOrder: 6 },
        ],
      },
    },
  });

  await prisma.incomeStatement.upsert({
    where: { id: "20000000-0000-0000-0000-000000000011" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000011",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2024,
      periodLabel: "Geschäftsjahr 2024",
      status: "final",
      finalizedAt: new Date("2025-03-15"),
      lineItems: {
        create: [
          { section: "ERTRAEGE", label: "Leasingerträge", currentAmount: 9_200_000, priorYearAmount: 8_400_000, sortOrder: 1 },
          { section: "ERTRAEGE", label: "Zinserträge", currentAmount: 350_000, priorYearAmount: 300_000, sortOrder: 2 },
          { section: "ERTRAEGE", label: "Sonstige betriebliche Erträge", currentAmount: 180_000, priorYearAmount: 150_000, sortOrder: 3 },
          { section: "AUFWENDUNGEN", label: "Abschreibungen auf Leasingvermögen", currentAmount: 5_100_000, priorYearAmount: 4_700_000, sortOrder: 4 },
          { section: "AUFWENDUNGEN", label: "Zinsaufwendungen", currentAmount: 2_200_000, priorYearAmount: 2_000_000, sortOrder: 5 },
          { section: "AUFWENDUNGEN", label: "Personalaufwand", currentAmount: 1_450_000, priorYearAmount: 1_300_000, sortOrder: 6 },
          { section: "AUFWENDUNGEN", label: "Sonstige betriebliche Aufwendungen", currentAmount: 780_000, priorYearAmount: 700_000, sortOrder: 7 },
          { section: "ERGEBNIS", label: "Jahresüberschuss", currentAmount: 200_000, priorYearAmount: 150_000, sortOrder: 8 },
        ],
      },
    },
  });

  await prisma.incomeStatement.upsert({
    where: { id: "20000000-0000-0000-0000-000000000012" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000012",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2025,
      periodLabel: "Geschäftsjahr 2025",
      status: "final",
      finalizedAt: new Date("2026-03-14"),
      lineItems: {
        create: [
          { section: "ERTRAEGE", label: "Leasingerträge", currentAmount: 10_400_000, priorYearAmount: 9_200_000, sortOrder: 1 },
          { section: "ERTRAEGE", label: "Zinserträge", currentAmount: 420_000, priorYearAmount: 350_000, sortOrder: 2 },
          { section: "ERTRAEGE", label: "Sonstige betriebliche Erträge", currentAmount: 210_000, priorYearAmount: 180_000, sortOrder: 3 },
          { section: "AUFWENDUNGEN", label: "Abschreibungen auf Leasingvermögen", currentAmount: 5_650_000, priorYearAmount: 5_100_000, sortOrder: 4 },
          { section: "AUFWENDUNGEN", label: "Zinsaufwendungen", currentAmount: 2_500_000, priorYearAmount: 2_200_000, sortOrder: 5 },
          { section: "AUFWENDUNGEN", label: "Personalaufwand", currentAmount: 1_600_000, priorYearAmount: 1_450_000, sortOrder: 6 },
          { section: "AUFWENDUNGEN", label: "Sonstige betriebliche Aufwendungen", currentAmount: 850_000, priorYearAmount: 780_000, sortOrder: 7 },
          { section: "ERGEBNIS", label: "Jahresüberschuss", currentAmount: 430_000, priorYearAmount: 200_000, sortOrder: 8 },
        ],
      },
    },
  });

  await prisma.incomeStatement.upsert({
    where: { id: "20000000-0000-0000-0000-000000000013" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000013",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2026,
      periodLabel: "Geschäftsjahr 2026 (laufend)",
      status: "entwurf",
      lineItems: {
        create: [
          { section: "ERTRAEGE", label: "Leasingerträge", currentAmount: 11_700_000, priorYearAmount: 10_400_000, sortOrder: 1 },
          { section: "ERTRAEGE", label: "Zinserträge", currentAmount: 480_000, priorYearAmount: 420_000, sortOrder: 2 },
          { section: "ERTRAEGE", label: "Sonstige betriebliche Erträge", currentAmount: 240_000, priorYearAmount: 210_000, sortOrder: 3 },
          { section: "AUFWENDUNGEN", label: "Abschreibungen auf Leasingvermögen", currentAmount: 6_200_000, priorYearAmount: 5_650_000, sortOrder: 4 },
          { section: "AUFWENDUNGEN", label: "Zinsaufwendungen", currentAmount: 2_750_000, priorYearAmount: 2_500_000, sortOrder: 5 },
          { section: "AUFWENDUNGEN", label: "Personalaufwand", currentAmount: 1_780_000, priorYearAmount: 1_600_000, sortOrder: 6 },
          { section: "AUFWENDUNGEN", label: "Sonstige betriebliche Aufwendungen", currentAmount: 990_000, priorYearAmount: 850_000, sortOrder: 7 },
          { section: "ERGEBNIS", label: "Jahresüberschuss", currentAmount: 700_000, priorYearAmount: 430_000, sortOrder: 8 },
        ],
      },
    },
  });

  await prisma.accountingNotes.upsert({
    where: { id: "20000000-0000-0000-0000-000000000021" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000021",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2025,
      status: "final",
      finalizedAt: new Date("2026-03-14"),
      sections: {
        create: [
          {
            title: "Bilanzierungs- und Bewertungsmethoden",
            content: "Das Leasingvermögen wird linear über die betriebsgewöhnliche Nutzungsdauer abgeschrieben. Forderungen aus Leasingverträgen werden zum Nennwert abzüglich Einzelwertberichtigungen angesetzt.",
            sortOrder: 1,
          },
          {
            title: "Angaben zu Verbindlichkeiten gegenüber Kreditinstituten",
            content: "Die Verbindlichkeiten gegenüber Kreditinstituten haben überwiegend eine Restlaufzeit von mehr als fünf Jahren und dienen der Refinanzierung des Leasingportfolios.",
            linkedLineItemLabel: "Verbindlichkeiten gegenüber Kreditinstituten",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.managementReport.upsert({
    where: { id: "20000000-0000-0000-0000-000000000031" },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000031",
      institutionId: institution.id,
      createdByUserId: buchhaltung.id,
      fiscalYear: 2025,
      status: "final",
      finalizedAt: new Date("2026-03-14"),
      sections: {
        create: [
          {
            title: "Geschäftsverlauf",
            content: "Das Neugeschäft im Leasingportfolio entwickelte sich planmäßig; die Leasingerträge stiegen um rund 13 % gegenüber dem Vorjahr.",
            sortOrder: 1,
          },
          {
            title: "Risikobericht",
            content: "Adressenausfallrisiken werden durch eine breite Diversifizierung des Kundenportfolios begrenzt. Zinsänderungsrisiken werden durch fristenkongruente Refinanzierung gesteuert.",
            sortOrder: 2,
          },
          {
            title: "Prognosebericht",
            content: "Für das Geschäftsjahr 2026 wird ein weiteres moderates Wachstum des Neugeschäfts sowie ein Anstieg des Jahresüberschusses erwartet.",
            sortOrder: 3,
          },
        ],
      },
    },
  });

  // --- Internal Control System (IKS) demo data -------------------------------------------------

  const p2p = await prisma.icsBusinessProcess.upsert({
    where: { id: "30000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000001",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      name: "Procure-to-Pay",
      owner: "Einkauf & Rechnungswesen",
      description: "Prozess von der Bestellanforderung über Wareneingang und Rechnungsprüfung bis zur Zahlung.",
    },
  });
  const o2c = await prisma.icsBusinessProcess.upsert({
    where: { id: "30000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000002",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      name: "Order-to-Cash",
      owner: "Vertrieb & Forderungsmanagement",
      description: "Prozess von der Vertragsanbahnung über Rechnungsstellung bis zum Zahlungseingang.",
    },
  });
  const payroll = await prisma.icsBusinessProcess.upsert({
    where: { id: "30000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000003",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      name: "Payroll",
      owner: "Personalabteilung",
      description: "Monatliche Gehaltsabrechnung inklusive Personalstammdatenpflege und Abrechnungsläufen.",
    },
  });
  const itAccess = await prisma.icsBusinessProcess.upsert({
    where: { id: "30000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000004",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      name: "IT Access Management",
      owner: "IT-Abteilung",
      description: "Vergabe, Überprüfung und Entzug von Berechtigungen für IT-Systeme und Kernanwendungen.",
    },
  });

  const controlP2P1 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000101" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000101",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "P2P-01",
      name: "Vier-Augen-Prinzip bei Zahlungsfreigabe",
      controlType: "MANUAL",
      frequency: "PER_TRANSACTION",
      description: "Jede Zahlung erfordert die Freigabe durch eine zweite, von der Rechnungserfassung unabhängige Person.",
      risksAddressed: "Fehlerhafte oder betrügerische Zahlungen",
      controlOwnerUserId: buchhaltung.id,
      businessProcesses: { create: [{ businessProcessId: p2p.id }] },
    },
  });
  await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000102" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000102",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "P2P-02",
      name: "Automatischer 3-Way-Match",
      controlType: "AUTOMATED",
      frequency: "PER_TRANSACTION",
      description: "Das ERP-System gleicht Bestellung, Wareneingang und Rechnung automatisiert ab, bevor eine Zahlung angestoßen wird.",
      risksAddressed: "Zahlung ohne zugrunde liegende Leistung",
      controlOwnerUserId: risikocontrolling.id,
      businessProcesses: { create: [{ businessProcessId: p2p.id }] },
    },
  });
  const controlO2C1 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000103" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000103",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "O2C-01",
      name: "Monatlicher Forderungsabgleich",
      controlType: "MANUAL",
      frequency: "MONTHLY",
      description: "Abgleich der offenen Forderungen aus Leasingverträgen mit der Debitorenbuchhaltung.",
      risksAddressed: "Fehlbestände oder verspätete Erkennung von Zahlungsausfällen",
      controlOwnerUserId: buchhaltung.id,
      businessProcesses: { create: [{ businessProcessId: o2c.id }] },
    },
  });
  const controlPayroll1 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000104" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000104",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "PAY-01",
      name: "Plausibilitätsprüfung Gehaltslauf",
      controlType: "AUTOMATED",
      frequency: "MONTHLY",
      description: "Automatisierter Soll-Ist-Vergleich der Gehaltssumme je Abrechnungslauf gegenüber dem Vormonat, Abweichungen werden markiert.",
      risksAddressed: "Fehlerhafte Gehaltsabrechnung",
      controlOwnerUserId: risikocontrolling.id,
      businessProcesses: { create: [{ businessProcessId: payroll.id }] },
    },
  });
  const controlPayroll2 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000105" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000105",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "PAY-02",
      name: "Vier-Augen-Prinzip Personalstammdatenänderung",
      controlType: "MANUAL",
      frequency: "PER_TRANSACTION",
      description: "Änderungen an Bankverbindung oder Gehalt in den Personalstammdaten erfordern eine zweite Freigabe.",
      risksAddressed: "Manipulation von Personalstammdaten",
      controlOwnerUserId: buchhaltung.id,
      businessProcesses: { create: [{ businessProcessId: payroll.id }] },
    },
  });
  const controlIt1 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000106" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000106",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "ITGC-01",
      name: "Quartalsweise Rezertifizierung der Zugriffsrechte",
      controlType: "ITGC",
      frequency: "QUARTERLY",
      description: "Fachbereichsleiter bestätigen quartalsweise, dass die vergebenen Berechtigungen in den Kernanwendungen weiterhin erforderlich sind.",
      risksAddressed: "Überhöhte oder verwaiste Zugriffsrechte",
      controlOwnerUserId: risikocontrolling.id,
      businessProcesses: { create: [{ businessProcessId: itAccess.id }] },
    },
  });
  const controlIt2 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000107" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000107",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "ITGC-02",
      name: "Automatische Deaktivierung bei Austritt",
      controlType: "ITGC",
      frequency: "PER_TRANSACTION",
      description: "Beim Austritt eines Mitarbeitenden werden alle Systemzugänge automatisiert über die HR-Schnittstelle gesperrt.",
      risksAddressed: "Fortbestehender Zugriff ausgeschiedener Mitarbeitender",
      controlOwnerUserId: risikocontrolling.id,
      businessProcesses: { create: [{ businessProcessId: itAccess.id }] },
    },
  });
  const controlIt3 = await prisma.icsControl.upsert({
    where: { id: "30000000-0000-0000-0000-000000000108" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000108",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      code: "ITGC-03",
      name: "Jährliche Passwortrichtlinien-Prüfung",
      controlType: "ITGC",
      frequency: "ANNUALLY",
      description: "Jährliche Überprüfung, ob die technischen Passwortrichtlinien in allen Kernanwendungen den Vorgaben entsprechen.",
      risksAddressed: "Unzureichende Zugangssicherung",
      controlOwnerUserId: revision.id,
      businessProcesses: { create: [{ businessProcessId: itAccess.id }] },
    },
  });

  await prisma.icsControlTest.upsert({
    where: { id: "30000000-0000-0000-0000-000000000201" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000201",
      controlId: controlIt1.id,
      createdByUserId: revision.id,
      plannedPeriod: "Q1 2026",
      plannedDate: new Date("2026-02-15"),
      status: "COMPLETED",
      result: "EFFECTIVE",
      resultNotes: "Stichprobe von 10 Nutzerkonten geprüft — Rezertifizierung vollständig und fristgerecht dokumentiert.",
      testedByUserId: revision.id,
      testedAt: new Date("2026-02-20"),
      evidence: {
        create: [
          {
            id: "30000000-0000-0000-0000-000000000301",
            fileObjectKey: "ics-evidence/rezertifizierung-q1-2026.pdf",
            fileName: "Rezertifizierung_Zugriffsrechte_Q1_2026.pdf",
            fileMime: "application/pdf",
            uploadedByUserId: revision.id,
          },
        ],
      },
    },
  });
  await prisma.icsControlTest.upsert({
    where: { id: "30000000-0000-0000-0000-000000000202" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000202",
      controlId: controlIt2.id,
      createdByUserId: risikocontrolling.id,
      plannedPeriod: "Q2 2026",
      plannedDate: new Date("2026-05-30"),
      status: "PLANNED",
    },
  });
  await prisma.icsControlTest.upsert({
    where: { id: "30000000-0000-0000-0000-000000000203" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000203",
      controlId: controlP2P1.id,
      createdByUserId: risikocontrolling.id,
      plannedPeriod: "Q1 2026",
      plannedDate: new Date("2026-03-10"),
      status: "COMPLETED",
      result: "DEFICIENT",
      resultNotes: "In 2 von 20 Stichproben fehlte die zweite Freigabe — Nachschärfung des Freigabeworkflows empfohlen.",
      testedByUserId: risikocontrolling.id,
      testedAt: new Date("2026-03-12"),
    },
  });

  await prisma.icsPolicyDocument.upsert({
    where: { id: "30000000-0000-0000-0000-000000000401" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000401",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      title: "Konzernrichtlinie Zahlungsverkehr",
      description: "Regelt Zeichnungsberechtigungen, Freigabeworkflows und Vier-Augen-Prinzip im Zahlungsverkehr.",
      documentType: "Richtlinie",
      fileObjectKey: "ics-policies/richtlinie-zahlungsverkehr-v3.pdf",
      fileName: "Richtlinie_Zahlungsverkehr_v3.pdf",
      fileMime: "application/pdf",
      uploadedByUserId: risikocontrolling.id,
      uploadedAt: new Date("2025-11-01"),
      businessProcesses: { create: [{ businessProcessId: p2p.id }] },
      controls: { create: [{ controlId: controlP2P1.id }] },
    },
  });
  await prisma.icsPolicyDocument.upsert({
    where: { id: "30000000-0000-0000-0000-000000000402" },
    update: {},
    create: {
      id: "30000000-0000-0000-0000-000000000402",
      institutionId: institution.id,
      createdByUserId: risikocontrolling.id,
      title: "Arbeitsanweisung Berechtigungsvergabe IT",
      description: "Beschreibt den Workflow zur Beantragung, Genehmigung und Rezertifizierung von IT-Berechtigungen.",
      documentType: "Arbeitsanweisung",
      fileObjectKey: "ics-policies/arbeitsanweisung-berechtigungsvergabe.pdf",
      fileName: "Arbeitsanweisung_Berechtigungsvergabe_IT.pdf",
      fileMime: "application/pdf",
      uploadedByUserId: risikocontrolling.id,
      uploadedAt: new Date("2025-09-15"),
      businessProcesses: { create: [{ businessProcessId: itAccess.id }] },
      controls: { create: [{ controlId: controlIt1.id }, { controlId: controlIt2.id }] },
    },
  });

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

  // --- DORA ICT-Register demo data (Art. 28-30) --------------------------------------------
  // Same Anbieter A/C as the Auslagerungsmanagement-Musterdaten oben — DORA erfasst zwar ein
  // eigenständiges Register, aber in der Praxis überschneiden sich die Anbieter oft mit dem
  // MaRisk-AT-9-Register, und die Demo soll diese Konsistenz zeigen statt neue Namen zu erfinden.
  const [anbieterA, anbieterC, anbieterKonzernIt] = await Promise.all([
    prisma.ictProvider.create({
      data: {
        institutionId: institution.id,
        name: "Anbieter A (Hyperscaler, EU-Region)",
        legalEntityIdentifier: "529900XJLQ2Z4KRC9V45",
        country: "Irland",
        providerType: "DIREKT",
      },
    }),
    prisma.ictProvider.create({
      data: {
        institutionId: institution.id,
        name: "Anbieter C (Zahlungsdienstleister, konzernweit genutzt)",
        country: "Niederlande",
        providerType: "DIREKT",
      },
    }),
    prisma.ictProvider.create({
      data: {
        institutionId: institution.id,
        name: "RegStack-Gruppe IT-Services GmbH",
        country: "Deutschland",
        providerType: "KONZERNINTERN",
        parentUndertaking: "Beispiel Finanzgruppe AG",
      },
    }),
  ]);

  await prisma.ictArrangement.create({
    data: {
      institutionId: institution.id,
      providerId: anbieterA.id,
      functionDescription: "Cloud-Hosting Kernanwendungen (IaaS/PaaS)",
      supportsCriticalFunction: true,
      criticalityReason: "Trägt sämtliche Kernbankprozesse; Ausfall unterbricht das gesamte Bankgeschäft.",
      contractStart: new Date("2023-01-01"),
      terminationNoticeMonths: 6,
      dataCategories: "Vertrags-, Kunden- und Zahlungsdaten",
      hasSubcontracting: true,
      subcontractingNote: "Rechenzentrumsbetrieb über regionale Tochtergesellschaften des Hyperscalers (EU-Region).",
      status: "AKTIV",
    },
  });
  await prisma.ictArrangement.create({
    data: {
      institutionId: institution.id,
      providerId: anbieterC.id,
      functionDescription: "Zahlungsabwicklung (Karten & Lastschrift)",
      supportsCriticalFunction: true,
      criticalityReason: "Ausfall unterbricht sämtliche Kundenzahlungen; keine kurzfristige Alternative am Markt.",
      contractStart: new Date("2022-06-01"),
      terminationNoticeMonths: 3,
      dataCategories: "Zahlungsdaten, Kontodaten",
      hasSubcontracting: false,
      status: "AKTIV",
    },
  });
  await prisma.ictArrangement.create({
    data: {
      institutionId: institution.id,
      providerId: anbieterKonzernIt.id,
      functionDescription: "Firmenkundenportal — Betrieb & Second-Level-Support",
      supportsCriticalFunction: false,
      contractStart: new Date("2021-04-01"),
      terminationNoticeMonths: 1,
      dataCategories: "Firmenkundendaten (keine Zahlungsdaten)",
      hasSubcontracting: false,
      status: "AKTIV",
    },
  });
  // Ein beendetes Vertragsverhältnis, damit das Register auch die Historie zeigt statt nur
  // aktive Einträge.
  await prisma.ictArrangement.create({
    data: {
      institutionId: institution.id,
      providerId: anbieterKonzernIt.id,
      functionDescription: "Alt-Rechenzentrum vor Migration zu Anbieter A",
      supportsCriticalFunction: false,
      contractStart: new Date("2018-01-01"),
      contractEnd: new Date("2022-12-31"),
      dataCategories: "Vertrags- und Kundendaten",
      hasSubcontracting: false,
      status: "BEENDET",
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded institution ${institution.name} with 3 activities (first: ${cloudHosting.id}), Compliance, Interne Revision, Accounting, IKS, Risikomanagement, IT-Risiko/BAIT (IT-Strategie ${itStrategie2026.jahr} verabschiedet), Externe Prüfungen (2025 + 2026), and DORA ICT-Register demo data.`
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
