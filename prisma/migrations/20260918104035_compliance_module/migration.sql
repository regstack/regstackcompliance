-- CreateEnum
CREATE TYPE "Relevanz" AS ENUM ('relevant', 'nicht_relevant');

-- CreateEnum
CREATE TYPE "Schweregrad" AS ENUM ('gering', 'mittel', 'wesentlich');

-- CreateEnum
CREATE TYPE "FeststellungStatus" AS ENUM ('offen', 'fachbereich_erledigt', 'wirksamkeit_bestaetigt', 'geschlossen', 'akzeptiertes_risiko');

-- CreateEnum
CREATE TYPE "HandshakeStatus" AS ENUM ('vorschlag', 'bestaetigt', 'widersprochen', 'entschieden');

-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('offen', 'geprueft', 'kenntnis', 'angewandt', 'projekt');

-- CreateEnum
CREATE TYPE "ComplianceReportStatus" AS ENUM ('entwurf', 'final');

-- CreateEnum
CREATE TYPE "EvidenceModule" AS ENUM ('OUTSOURCING', 'COMPLIANCE', 'INTERNAL_AUDIT');

-- CreateTable
CREATE TABLE "compliance_quellen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "bezugsweg" TEXT,
    "turnus" TEXT,
    "verantwortlichUserId" TEXT,
    "letzteDurchsicht" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_quellen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_aenderungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "quelleId" TEXT,
    "erfasstAm" TIMESTAMP(3) NOT NULL,
    "gegenstand" TEXT NOT NULL,
    "kritikalitaet" TEXT,
    "inkrafttreten" TEXT,
    "zugewiesenAnUserId" TEXT,
    "disposition" "Disposition" NOT NULL DEFAULT 'offen',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_aenderungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_normen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "quelle" TEXT,
    "sachgebiet" TEXT,
    "relevanz" "Relevanz" NOT NULL DEFAULT 'relevant',
    "relevanzBegruendung" TEXT,
    "relevanzUebersteuert" BOOLEAN NOT NULL DEFAULT false,
    "wesentlichkeit" TEXT,
    "wesentlichkeitBegruendung" TEXT,
    "risiko" TEXT,
    "status" TEXT NOT NULL DEFAULT 'manuell',
    "stand" TEXT,
    "personalunion" BOOLEAN NOT NULL DEFAULT false,
    "fachbereichUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_normen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_norm_handshakes" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "normId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "status" "HandshakeStatus" NOT NULL DEFAULT 'vorschlag',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP(3),
    "decisionByUserId" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "compliance_norm_handshakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_feststellungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "normId" TEXT,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "schweregrad" "Schweregrad",
    "frist" TIMESTAMP(3),
    "massnahme" TEXT,
    "quelle" TEXT,
    "verantwortlichUserId" TEXT,
    "status" "FeststellungStatus" NOT NULL DEFAULT 'offen',
    "fachbereichErledigtAm" TIMESTAMP(3),
    "fachbereichErledigtVon" TEXT,
    "wirksamkeitBestaetigtAm" TIMESTAMP(3),
    "wirksamkeitBestaetigtVon" TEXT,
    "geschlossenAm" TIMESTAMP(3),
    "geschlossenVon" TEXT,
    "akzeptiertesRisikoEntscheider" TEXT,
    "akzeptiertesRisikoUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_feststellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_ratings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "begruendung" TEXT,
    "erfasstVonUserId" TEXT,
    "erfasstAm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_governance_settings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sonderfallKleinesInstitut" BOOLEAN NOT NULL DEFAULT false,
    "interessenkonfliktMassnahmen" TEXT,
    "kombinationRationale" TEXT,
    "ressourcenausstattung" TEXT,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_governance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" "ComplianceReportStatus" NOT NULL DEFAULT 'entwurf',
    "content" JSONB NOT NULL DEFAULT '{}',
    "finalizedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_report_acknowledgements" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_report_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_risiken" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nr" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "eintrittswahrscheinlichkeit" TEXT,
    "auswirkung" TEXT,
    "inhaerent" TEXT,
    "kontrollbewertung" TEXT,
    "restrisiko" TEXT,
    "massnahme" TEXT,
    "verantwortlichUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_risiken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_kontrollen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "normId" TEXT,
    "verfahren" TEXT NOT NULL,
    "prozess" TEXT,
    "turnus" TEXT,
    "letzteDurchfuehrung" TIMESTAMP(3),
    "naechsteFaelligkeit" TIMESTAMP(3),
    "wirksamkeit" TEXT,
    "verantwortlichUserId" TEXT,
    "autorUserId" TEXT,
    "freigegebenVonUserId" TEXT,
    "freigegebenAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_kontrollen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_norm_risiken" (
    "normId" TEXT NOT NULL,
    "risikoId" TEXT NOT NULL,

    CONSTRAINT "compliance_norm_risiken_pkey" PRIMARY KEY ("normId","risikoId")
);

-- CreateTable
CREATE TABLE "compliance_risiko_kontrollen" (
    "risikoId" TEXT NOT NULL,
    "kontrolleId" TEXT NOT NULL,

    CONSTRAINT "compliance_risiko_kontrollen_pkey" PRIMARY KEY ("risikoId","kontrolleId")
);

-- CreateTable
CREATE TABLE "compliance_beratung_schulung" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "thema" TEXT NOT NULL,
    "adressat" TEXT,
    "format" TEXT,
    "nachweisText" TEXT,

    CONSTRAINT "compliance_beratung_schulung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_beauftragtenfunktionen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "funktion" TEXT NOT NULL,
    "rechtsgrundlage" TEXT,
    "inhaberUserId" TEXT,
    "stellvertretungUserId" TEXT,
    "bestelltAm" TIMESTAMP(3),
    "anzeigeAufsicht" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "compliance_beauftragtenfunktionen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_funktionswechsel" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "funktionId" TEXT,
    "datum" TIMESTAMP(3) NOT NULL,
    "bisherText" TEXT,
    "neuUserId" TEXT,
    "beschluss" TEXT,
    "anzeigeAufsicht" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "compliance_funktionswechsel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_erleichterungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "gegenstand" TEXT NOT NULL,
    "rechtsgrundlage" TEXT,
    "gewaehrtDurch" TEXT,
    "gewaehrtAm" TIMESTAMP(3),
    "aktenzeichen" TEXT,
    "reichweite" TEXT,
    "formalErleichtert" BOOLEAN NOT NULL DEFAULT false,
    "materiellErfuellt" BOOLEAN NOT NULL DEFAULT false,
    "begruendung" TEXT,
    "ueberpruefung" TIMESTAMP(3),

    CONSTRAINT "compliance_erleichterungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_stellenbeschreibungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "dokument" TEXT NOT NULL,
    "fassung" TEXT,
    "genehmigtDurchUserId" TEXT,
    "genehmigtAm" TIMESTAMP(3),
    "naechsteUeberpruefung" TIMESTAMP(3),

    CONSTRAINT "compliance_stellenbeschreibungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_gremien_zulieferungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "grundlage" TEXT,
    "turnus" TEXT,
    "letzterEingang" TIMESTAMP(3),

    CONSTRAINT "compliance_gremien_zulieferungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_ereignisse" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "ausloeser" TEXT,
    "gegenstand" TEXT NOT NULL,
    "beteiligung" TEXT,
    "votum" TEXT,

    CONSTRAINT "compliance_ereignisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nachweise" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "module" "EvidenceModule" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "dateiname" TEXT NOT NULL,
    "fileRef" TEXT,
    "hash" TEXT,
    "aufbewahrungsfrist" TEXT,
    "previousVersionId" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nachweise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_quellen_institutionId_idx" ON "compliance_quellen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_aenderungen_institutionId_idx" ON "compliance_aenderungen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_normen_institutionId_idx" ON "compliance_normen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_norm_handshakes_institutionId_idx" ON "compliance_norm_handshakes"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_norm_handshakes_normId_idx" ON "compliance_norm_handshakes"("normId");

-- CreateIndex
CREATE INDEX "compliance_feststellungen_institutionId_idx" ON "compliance_feststellungen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_feststellungen_normId_idx" ON "compliance_feststellungen"("normId");

-- CreateIndex
CREATE INDEX "compliance_ratings_institutionId_idx" ON "compliance_ratings"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_governance_settings_institutionId_key" ON "compliance_governance_settings"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_reports_institutionId_idx" ON "compliance_reports"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_report_acknowledgements_reportId_userId_key" ON "compliance_report_acknowledgements"("reportId", "userId");

-- CreateIndex
CREATE INDEX "compliance_risiken_institutionId_idx" ON "compliance_risiken"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_kontrollen_institutionId_idx" ON "compliance_kontrollen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_kontrollen_normId_idx" ON "compliance_kontrollen"("normId");

-- CreateIndex
CREATE INDEX "compliance_beratung_schulung_institutionId_idx" ON "compliance_beratung_schulung"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_beauftragtenfunktionen_institutionId_idx" ON "compliance_beauftragtenfunktionen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_funktionswechsel_institutionId_idx" ON "compliance_funktionswechsel"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_erleichterungen_institutionId_idx" ON "compliance_erleichterungen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_stellenbeschreibungen_institutionId_idx" ON "compliance_stellenbeschreibungen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_gremien_zulieferungen_institutionId_idx" ON "compliance_gremien_zulieferungen"("institutionId");

-- CreateIndex
CREATE INDEX "compliance_ereignisse_institutionId_idx" ON "compliance_ereignisse"("institutionId");

-- CreateIndex
CREATE INDEX "nachweise_institutionId_module_idx" ON "nachweise"("institutionId", "module");

-- AddForeignKey
ALTER TABLE "compliance_quellen" ADD CONSTRAINT "compliance_quellen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_aenderungen" ADD CONSTRAINT "compliance_aenderungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_aenderungen" ADD CONSTRAINT "compliance_aenderungen_quelleId_fkey" FOREIGN KEY ("quelleId") REFERENCES "compliance_quellen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_normen" ADD CONSTRAINT "compliance_normen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_norm_handshakes" ADD CONSTRAINT "compliance_norm_handshakes_normId_fkey" FOREIGN KEY ("normId") REFERENCES "compliance_normen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_feststellungen" ADD CONSTRAINT "compliance_feststellungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_feststellungen" ADD CONSTRAINT "compliance_feststellungen_normId_fkey" FOREIGN KEY ("normId") REFERENCES "compliance_normen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_ratings" ADD CONSTRAINT "compliance_ratings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_governance_settings" ADD CONSTRAINT "compliance_governance_settings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_report_acknowledgements" ADD CONSTRAINT "compliance_report_acknowledgements_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "compliance_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_risiken" ADD CONSTRAINT "compliance_risiken_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_kontrollen" ADD CONSTRAINT "compliance_kontrollen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_kontrollen" ADD CONSTRAINT "compliance_kontrollen_normId_fkey" FOREIGN KEY ("normId") REFERENCES "compliance_normen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_norm_risiken" ADD CONSTRAINT "compliance_norm_risiken_normId_fkey" FOREIGN KEY ("normId") REFERENCES "compliance_normen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_norm_risiken" ADD CONSTRAINT "compliance_norm_risiken_risikoId_fkey" FOREIGN KEY ("risikoId") REFERENCES "compliance_risiken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_risiko_kontrollen" ADD CONSTRAINT "compliance_risiko_kontrollen_risikoId_fkey" FOREIGN KEY ("risikoId") REFERENCES "compliance_risiken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_risiko_kontrollen" ADD CONSTRAINT "compliance_risiko_kontrollen_kontrolleId_fkey" FOREIGN KEY ("kontrolleId") REFERENCES "compliance_kontrollen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_beratung_schulung" ADD CONSTRAINT "compliance_beratung_schulung_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_beauftragtenfunktionen" ADD CONSTRAINT "compliance_beauftragtenfunktionen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_funktionswechsel" ADD CONSTRAINT "compliance_funktionswechsel_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_funktionswechsel" ADD CONSTRAINT "compliance_funktionswechsel_funktionId_fkey" FOREIGN KEY ("funktionId") REFERENCES "compliance_beauftragtenfunktionen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_erleichterungen" ADD CONSTRAINT "compliance_erleichterungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_stellenbeschreibungen" ADD CONSTRAINT "compliance_stellenbeschreibungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_gremien_zulieferungen" ADD CONSTRAINT "compliance_gremien_zulieferungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_ereignisse" ADD CONSTRAINT "compliance_ereignisse_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nachweise" ADD CONSTRAINT "nachweise_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nachweise" ADD CONSTRAINT "nachweise_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "nachweise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
