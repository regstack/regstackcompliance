-- CreateEnum
CREATE TYPE "BaitPruefungStatus" AS ENUM ('geplant', 'laufend', 'abgeschlossen');

-- CreateEnum
CREATE TYPE "BaitFeststellungSchweregrad" AS ENUM ('niedrig', 'mittel', 'hoch', 'kritisch');

-- CreateEnum
CREATE TYPE "BaitFeststellungStatus" AS ENUM ('offen', 'in_bearbeitung', 'geschlossen');

-- CreateEnum
CREATE TYPE "BaitSchutzbedarf" AS ENUM ('normal', 'hoch', 'sehr_hoch');

-- CreateEnum
CREATE TYPE "BaitRisikostufe" AS ENUM ('niedrig', 'mittel', 'hoch', 'sehr_hoch');

-- CreateEnum
CREATE TYPE "BaitBehandlungsoption" AS ENUM ('vermeiden', 'mindern', 'akzeptieren', 'transferieren');

-- CreateTable
CREATE TABLE "bait_it_pruefungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "informationsverbundId" TEXT,
    "subject" TEXT NOT NULL,
    "systemBezeichnung" TEXT,
    "scope" TEXT,
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "pruefer" TEXT,
    "status" "BaitPruefungStatus" NOT NULL DEFAULT 'geplant',
    "overallRating" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_pruefungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_pruefungsfeststellungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "pruefungId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "schweregrad" "BaitFeststellungSchweregrad",
    "status" "BaitFeststellungStatus" NOT NULL DEFAULT 'offen',
    "frist" TIMESTAMP(3),
    "verantwortlichUserId" TEXT,
    "massnahme" TEXT,
    "geschlossenAm" TIMESTAMP(3),
    "geschlossenVon" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_pruefungsfeststellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_informationsverbuende" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "verantwortlichUserId" TEXT,
    "schutzbedarfVertraulichkeit" "BaitSchutzbedarf" NOT NULL DEFAULT 'normal',
    "schutzbedarfIntegritaet" "BaitSchutzbedarf" NOT NULL DEFAULT 'normal',
    "schutzbedarfVerfuegbarkeit" "BaitSchutzbedarf" NOT NULL DEFAULT 'normal',
    "schutzbedarfAuthentizitaet" "BaitSchutzbedarf" NOT NULL DEFAULT 'normal',
    "schutzbedarfBegruendung" TEXT,
    "klassifiziertAm" TIMESTAMP(3),
    "klassifiziertVonUserId" TEXT,
    "nextReviewDueAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_informationsverbuende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_risikobewertungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "informationsverbundId" TEXT NOT NULL,
    "bedrohung" TEXT NOT NULL,
    "schwachstelle" TEXT,
    "eintrittswahrscheinlichkeit" "BaitRisikostufe" NOT NULL,
    "auswirkung" "BaitRisikostufe" NOT NULL,
    "risikoklasse" "BaitRisikostufe" NOT NULL,
    "behandlungsoption" "BaitBehandlungsoption",
    "behandlungBegruendung" TEXT,
    "restrisiko" "BaitRisikostufe",
    "verantwortlichUserId" TEXT,
    "bewertetAm" TIMESTAMP(3),
    "bewertetVonUserId" TEXT,
    "nextReviewDueAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_risikobewertungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bait_it_pruefungen_institutionId_idx" ON "bait_it_pruefungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_pruefungen_informationsverbundId_idx" ON "bait_it_pruefungen"("informationsverbundId");

-- CreateIndex
CREATE INDEX "bait_it_pruefungsfeststellungen_institutionId_idx" ON "bait_it_pruefungsfeststellungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_pruefungsfeststellungen_pruefungId_idx" ON "bait_it_pruefungsfeststellungen"("pruefungId");

-- CreateIndex
CREATE INDEX "bait_informationsverbuende_institutionId_idx" ON "bait_informationsverbuende"("institutionId");

-- CreateIndex
CREATE INDEX "bait_risikobewertungen_institutionId_idx" ON "bait_risikobewertungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_risikobewertungen_informationsverbundId_idx" ON "bait_risikobewertungen"("informationsverbundId");

-- AddForeignKey
ALTER TABLE "bait_it_pruefungen" ADD CONSTRAINT "bait_it_pruefungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_pruefungen" ADD CONSTRAINT "bait_it_pruefungen_informationsverbundId_fkey" FOREIGN KEY ("informationsverbundId") REFERENCES "bait_informationsverbuende"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_pruefungsfeststellungen" ADD CONSTRAINT "bait_it_pruefungsfeststellungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_pruefungsfeststellungen" ADD CONSTRAINT "bait_it_pruefungsfeststellungen_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "bait_it_pruefungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_informationsverbuende" ADD CONSTRAINT "bait_informationsverbuende_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_risikobewertungen" ADD CONSTRAINT "bait_risikobewertungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_risikobewertungen" ADD CONSTRAINT "bait_risikobewertungen_informationsverbundId_fkey" FOREIGN KEY ("informationsverbundId") REFERENCES "bait_informationsverbuende"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
