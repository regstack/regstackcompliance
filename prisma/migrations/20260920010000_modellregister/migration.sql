-- CreateEnum
CREATE TYPE "ModellStatus" AS ENUM ('in_entwicklung', 'aktiv', 'ausser_betrieb');

-- CreateTable
CREATE TABLE "rm_modellregister" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "zweck" TEXT NOT NULL,
    "istKiBasiert" BOOLEAN NOT NULL DEFAULT false,
    "status" "ModellStatus" NOT NULL DEFAULT 'in_entwicklung',
    "verantwortlichUserId" TEXT,
    "letzteValidierung" TIMESTAMP(3),
    "naechsteValidierung" TIMESTAMP(3),
    "validierungsergebnis" TEXT,
    "erklaerbarkeitBewertung" TEXT,
    "ueberschreibungenBeschreibung" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_modellregister_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_modellregister_institutionId_idx" ON "rm_modellregister"("institutionId");

-- AddForeignKey
ALTER TABLE "rm_modellregister" ADD CONSTRAINT "rm_modellregister_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
