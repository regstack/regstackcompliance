-- CreateEnum
CREATE TYPE "ItEntwicklungsart" AS ENUM ('eigenentwicklung', 'fremdentwicklung');

-- CreateEnum
CREATE TYPE "ItBerechtigungStatus" AS ENUM ('aktiv', 'deaktiviert', 'entzogen');

-- CreateEnum
CREATE TYPE "ItProjektStatus" AS ENUM ('geplant', 'laufend', 'abgeschlossen', 'abgebrochen');

-- CreateEnum
CREATE TYPE "ItAenderungStatus" AS ENUM ('beantragt', 'genehmigt', 'umgesetzt', 'zurueckgestellt');

-- AlterTable
ALTER TABLE "bait_it_assets" ADD COLUMN     "fremdOderEigenentwicklung" "ItEntwicklungsart",
ADD COLUMN     "istIdv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "technischVerantwortlichUserId" TEXT,
ADD COLUMN     "technologie" TEXT,
ADD COLUMN     "version" TEXT,
ADD COLUMN     "zweck" TEXT;

-- CreateTable
CREATE TABLE "bait_it_berechtigungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "assetId" TEXT,
    "benutzerBezeichnung" TEXT NOT NULL,
    "benutzerUserId" TEXT,
    "istTechnischerBenutzer" BOOLEAN NOT NULL DEFAULT false,
    "istPrivilegiert" BOOLEAN NOT NULL DEFAULT false,
    "berechtigungsart" TEXT NOT NULL,
    "needToKnowBegruendung" TEXT,
    "befristetBis" TIMESTAMP(3),
    "status" "ItBerechtigungStatus" NOT NULL DEFAULT 'aktiv',
    "genehmigtVonUserId" TEXT,
    "deaktiviertAm" TIMESTAMP(3),
    "deaktiviertVonUserId" TEXT,
    "letzteRezertifizierung" TIMESTAMP(3),
    "naechsteRezertifizierung" TIMESTAMP(3),
    "rezertifiziertVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_berechtigungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_projekte" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "ziel" TEXT,
    "vorgehensmodell" TEXT,
    "risikobewertung" TEXT,
    "ressourcenausstattung" TEXT,
    "verantwortlichUserId" TEXT,
    "status" "ItProjektStatus" NOT NULL DEFAULT 'geplant',
    "startAm" TIMESTAMP(3),
    "geplantesEndeAm" TIMESTAMP(3),
    "tatsaechlichesEndeAm" TIMESTAMP(3),
    "lessonsLearned" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_projekte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_aenderungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "assetId" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "art" TEXT,
    "risikobewertung" TEXT,
    "testErgebnis" TEXT,
    "rueckabwicklungsplan" TEXT,
    "status" "ItAenderungStatus" NOT NULL DEFAULT 'beantragt',
    "geplantAm" TIMESTAMP(3),
    "genehmigtVonUserId" TEXT,
    "genehmigtAm" TIMESTAMP(3),
    "umgesetztAm" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_aenderungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bait_it_berechtigungen_institutionId_idx" ON "bait_it_berechtigungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_berechtigungen_assetId_idx" ON "bait_it_berechtigungen"("assetId");

-- CreateIndex
CREATE INDEX "bait_it_projekte_institutionId_idx" ON "bait_it_projekte"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_aenderungen_institutionId_idx" ON "bait_it_aenderungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_aenderungen_assetId_idx" ON "bait_it_aenderungen"("assetId");

-- AddForeignKey
ALTER TABLE "bait_it_berechtigungen" ADD CONSTRAINT "bait_it_berechtigungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_berechtigungen" ADD CONSTRAINT "bait_it_berechtigungen_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "bait_it_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_projekte" ADD CONSTRAINT "bait_it_projekte_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_aenderungen" ADD CONSTRAINT "bait_it_aenderungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_aenderungen" ADD CONSTRAINT "bait_it_aenderungen_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "bait_it_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

