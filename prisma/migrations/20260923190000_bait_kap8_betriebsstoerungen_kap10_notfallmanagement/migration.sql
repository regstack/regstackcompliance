-- CreateEnum
CREATE TYPE "ItStoerungPrioritaet" AS ENUM ('niedrig', 'mittel', 'hoch', 'kritisch');

-- CreateEnum
CREATE TYPE "ItStoerungStatus" AS ENUM ('offen', 'in_bearbeitung', 'geschlossen');

-- CreateEnum
CREATE TYPE "ItNotfallplanStatus" AS ENUM ('entwurf', 'freigegeben');

-- CreateTable
CREATE TABLE "bait_it_betriebsstoerungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "betroffeneSysteme" TEXT,
    "ursache" TEXT,
    "prioritaet" "ItStoerungPrioritaet" NOT NULL DEFAULT 'mittel',
    "status" "ItStoerungStatus" NOT NULL DEFAULT 'offen',
    "massnahme" TEXT,
    "eskalationAnUserId" TEXT,
    "geschaeftsleitungInformiert" BOOLEAN NOT NULL DEFAULT false,
    "abschlussAm" TIMESTAMP(3),
    "abschlussVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_betriebsstoerungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_notfallplaene" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "assetId" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "rto" TEXT,
    "rpo" TEXT,
    "konfigurationNotbetrieb" TEXT,
    "abhaengigkeiten" TEXT,
    "status" "ItNotfallplanStatus" NOT NULL DEFAULT 'entwurf',
    "freigegebenVonUserId" TEXT,
    "freigegebenAm" TIMESTAMP(3),
    "letzterTestAm" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_notfallplaene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_it_notfalltests" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "notfallplanId" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "umfang" TEXT,
    "ergebnis" TEXT,
    "abgeleiteteMassnahmen" TEXT,
    "durchgefuehrtVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bait_it_notfalltests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bait_it_betriebsstoerungen_institutionId_idx" ON "bait_it_betriebsstoerungen"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_notfallplaene_institutionId_idx" ON "bait_it_notfallplaene"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_notfallplaene_assetId_idx" ON "bait_it_notfallplaene"("assetId");

-- CreateIndex
CREATE INDEX "bait_it_notfalltests_institutionId_idx" ON "bait_it_notfalltests"("institutionId");

-- CreateIndex
CREATE INDEX "bait_it_notfalltests_notfallplanId_idx" ON "bait_it_notfalltests"("notfallplanId");

-- AddForeignKey
ALTER TABLE "bait_it_betriebsstoerungen" ADD CONSTRAINT "bait_it_betriebsstoerungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_notfallplaene" ADD CONSTRAINT "bait_it_notfallplaene_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_notfallplaene" ADD CONSTRAINT "bait_it_notfallplaene_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "bait_it_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_notfalltests" ADD CONSTRAINT "bait_it_notfalltests_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bait_it_notfalltests" ADD CONSTRAINT "bait_it_notfalltests_notfallplanId_fkey" FOREIGN KEY ("notfallplanId") REFERENCES "bait_it_notfallplaene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- RLS is backend-only defense-in-depth (no policies) — see 20260919190000_enable_rls_backend_only.
ALTER TABLE "public"."bait_it_betriebsstoerungen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bait_it_notfallplaene" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bait_it_notfalltests" ENABLE ROW LEVEL SECURITY;
