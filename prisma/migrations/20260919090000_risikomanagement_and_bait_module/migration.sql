-- CreateEnum
CREATE TYPE "RisikoartKategorie" AS ENUM ('ADRESSENAUSFALLRISIKO', 'MARKTPREISRISIKO_HANDELSBUCH', 'MARKTPREISRISIKO_ANLAGEBUCH', 'LIQUIDITAETSRISIKO', 'OPERATIONELLES_RISIKO', 'KONZENTRATIONSRISIKO', 'ESG_RISIKO', 'SONSTIGES_RISIKO');

-- CreateEnum
CREATE TYPE "RmWesentlichkeit" AS ENUM ('wesentlich', 'nicht_wesentlich');

-- CreateEnum
CREATE TYPE "RmStrategieArt" AS ENUM ('geschaeftsstrategie', 'risikostrategie', 'teilstrategie');

-- CreateEnum
CREATE TYPE "RmStrategieStatus" AS ENUM ('entwurf', 'verabschiedet');

-- CreateEnum
CREATE TYPE "RtfAnsatz" AS ENUM ('normativ', 'oekonomisch');

-- CreateEnum
CREATE TYPE "RmReportStatus" AS ENUM ('entwurf', 'final');

-- CreateEnum
CREATE TYPE "ItStrategieStatus" AS ENUM ('entwurf', 'verabschiedet');

-- CreateEnum
CREATE TYPE "ItSchutzbedarf" AS ENUM ('normal', 'hoch', 'sehr_hoch');

-- CreateEnum
CREATE TYPE "ItAssetKategorie" AS ENUM ('anwendung', 'it_system', 'netzwerk', 'rechenzentrum', 'sonstige');

-- CreateEnum
CREATE TYPE "ItRisikoStatus" AS ENUM ('offen', 'in_bearbeitung', 'akzeptiert_von_gl', 'geschlossen');

-- CreateEnum
CREATE TYPE "ItVorfallSchweregrad" AS ENUM ('gering', 'mittel', 'hoch', 'kritisch');

-- CreateEnum
CREATE TYPE "ItVorfallStatus" AS ENUM ('offen', 'in_bearbeitung', 'geschlossen');

-- CreateTable
CREATE TABLE "rm_risikoinventur" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "kategorie" "RisikoartKategorie" NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "wesentlichkeit" "RmWesentlichkeit" NOT NULL,
    "begruendung" TEXT,
    "methodik" TEXT,
    "verantwortlichUserId" TEXT,
    "letzteUeberpruefung" TIMESTAMP(3),
    "naechsteUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_risikoinventur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_strategien" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "art" "RmStrategieArt" NOT NULL,
    "jahr" INTEGER NOT NULL,
    "inhalt" JSONB NOT NULL DEFAULT '{}',
    "status" "RmStrategieStatus" NOT NULL DEFAULT 'entwurf',
    "verabschiedetAm" TIMESTAMP(3),
    "verabschiedetVonUserId" TEXT,
    "naechsteUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_strategien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_risikotragfaehigkeit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "ansatz" "RtfAnsatz" NOT NULL,
    "risikodeckungspotenzial" DOUBLE PRECISION,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "auslastungGesamt" DOUBLE PRECISION,
    "ergebnis" TEXT,
    "methodenpruefungAm" TIMESTAMP(3),
    "freigegebenVonUserId" TEXT,
    "freigegebenAm" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_risikotragfaehigkeit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_reports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" "RmReportStatus" NOT NULL DEFAULT 'entwurf',
    "content" JSONB NOT NULL DEFAULT '{}',
    "finalizedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_report_acknowledgements" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rm_report_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_strategien" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "inhalt" JSONB NOT NULL DEFAULT '{}',
    "status" "ItStrategieStatus" NOT NULL DEFAULT 'entwurf',
    "verabschiedetAm" TIMESTAMP(3),
    "verabschiedetVonUserId" TEXT,
    "konsistenzpruefungGeschaeftsstrategie" TEXT,
    "naechsteUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_strategien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_assets" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "kategorie" "ItAssetKategorie" NOT NULL,
    "eigentuemerUserId" TEXT,
    "schutzbedarfVertraulichkeit" "ItSchutzbedarf",
    "schutzbedarfIntegritaet" "ItSchutzbedarf",
    "schutzbedarfVerfuegbarkeit" "ItSchutzbedarf",
    "begruendung" TEXT,
    "letzteUeberpruefung" TIMESTAMP(3),
    "naechsteUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_risiken" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "assetId" TEXT,
    "bedrohung" TEXT NOT NULL,
    "eintrittswahrscheinlichkeit" TEXT,
    "auswirkung" TEXT,
    "bruttorisiko" TEXT,
    "massnahme" TEXT,
    "restrisiko" TEXT,
    "status" "ItRisikoStatus" NOT NULL DEFAULT 'offen',
    "verantwortlichUserId" TEXT,
    "akzeptiertVonUserId" TEXT,
    "akzeptiertAm" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_risiken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_sicherheitsvorfaelle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "kategorie" TEXT,
    "schweregrad" "ItVorfallSchweregrad" NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "betroffeneSysteme" TEXT,
    "eskalationAnUserId" TEXT,
    "meldepflichtBaFin" BOOLEAN NOT NULL DEFAULT false,
    "meldedatumBaFin" TIMESTAMP(3),
    "status" "ItVorfallStatus" NOT NULL DEFAULT 'offen',
    "massnahme" TEXT,
    "abschlussAm" TIMESTAMP(3),
    "abschlussVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_sicherheitsvorfaelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_risikoinventur_institutionId_idx" ON "rm_risikoinventur"("institutionId");

-- CreateIndex
CREATE INDEX "rm_strategien_institutionId_idx" ON "rm_strategien"("institutionId");

-- CreateIndex
CREATE INDEX "rm_risikotragfaehigkeit_institutionId_idx" ON "rm_risikotragfaehigkeit"("institutionId");

-- CreateIndex
CREATE INDEX "rm_reports_institutionId_idx" ON "rm_reports"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "rm_report_acknowledgements_reportId_userId_key" ON "rm_report_acknowledgements"("reportId", "userId");

-- CreateIndex
CREATE INDEX "bait_it_strategien_institutionId_idx" ON "bait_it_strategien"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_assets_institutionId_idx" ON "bait_it_assets"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_risiken_institutionId_idx" ON "bait_it_risiken"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_risiken_assetId_idx" ON "bait_it_risiken"("assetId");

-- CreateIndex
CREATE INDEX "bait_it_sicherheitsvorfaelle_institutionId_idx" ON "bait_it_sicherheitsvorfaelle"("institutionId");

-- AddForeignKey
ALTER TABLE "rm_risikoinventur" ADD CONSTRAINT "rm_risikoinventur_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_strategien" ADD CONSTRAINT "rm_strategien_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_risikotragfaehigkeit" ADD CONSTRAINT "rm_risikotragfaehigkeit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_reports" ADD CONSTRAINT "rm_reports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_report_acknowledgements" ADD CONSTRAINT "rm_report_acknowledgements_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "rm_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_strategien" ADD CONSTRAINT "bait_it_strategien_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_assets" ADD CONSTRAINT "bait_it_assets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_risiken" ADD CONSTRAINT "bait_it_risiken_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_risiken" ADD CONSTRAINT "bait_it_risiken_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "bait_it_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_sicherheitsvorfaelle" ADD CONSTRAINT "bait_it_sicherheitsvorfaelle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
