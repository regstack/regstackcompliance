-- CreateEnum
CREATE TYPE "RmReportEmpfaenger" AS ENUM ('geschaeftsleitung', 'aufsichtsorgan');

-- AlterTable
ALTER TABLE "rm_reports" ADD COLUMN "empfaenger" "RmReportEmpfaenger" NOT NULL DEFAULT 'geschaeftsleitung';

-- CreateTable
CREATE TABLE "rm_npl_kennzahlen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nplQuote" DOUBLE PRECISION,
    "nplBestand" DOUBLE PRECISION,
    "zielQuote" DOUBLE PRECISION,
    "abbaupfadEingehalten" BOOLEAN,
    "massnahmen" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_npl_kennzahlen_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "RmModellErklaerbarkeit" AS ENUM ('hoch', 'mittel', 'gering');

-- CreateEnum
CREATE TYPE "RmModellStatus" AS ENUM ('aktiv', 'ausser_betrieb');

-- CreateEnum
CREATE TYPE "RmModellValidierungErgebnis" AS ENUM ('bestaetigt', 'rekalibrierung_erforderlich', 'ausser_betrieb_genommen');

-- CreateTable
CREATE TABLE "rm_modelle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "zweck" TEXT,
    "enthaeltKiMlKomponente" BOOLEAN NOT NULL DEFAULT false,
    "erklaerbarkeit" "RmModellErklaerbarkeit",
    "ueberschreibungenVorhanden" BOOLEAN NOT NULL DEFAULT false,
    "ueberschreibungenBegruendung" TEXT,
    "verantwortlichUserId" TEXT,
    "status" "RmModellStatus" NOT NULL DEFAULT 'aktiv',
    "naechsteValidierung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_modelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_modell_validierungen" (
    "id" TEXT NOT NULL,
    "modellId" TEXT NOT NULL,
    "durchgefuehrtAm" TIMESTAMP(3) NOT NULL,
    "durchgefuehrtVonUserId" TEXT,
    "ergebnis" "RmModellValidierungErgebnis" NOT NULL,
    "kommentar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rm_modell_validierungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_npl_kennzahlen_institutionId_idx" ON "rm_npl_kennzahlen"("institutionId");

-- CreateIndex
CREATE INDEX "rm_modelle_institutionId_idx" ON "rm_modelle"("institutionId");

-- CreateIndex
CREATE INDEX "rm_modell_validierungen_modellId_idx" ON "rm_modell_validierungen"("modellId");

-- AddForeignKey
ALTER TABLE "rm_npl_kennzahlen" ADD CONSTRAINT "rm_npl_kennzahlen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_modelle" ADD CONSTRAINT "rm_modelle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_modell_validierungen" ADD CONSTRAINT "rm_modell_validierungen_modellId_fkey" FOREIGN KEY ("modellId") REFERENCES "rm_modelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EnableRowLevelSecurity (defense-in-depth, backend-only, no policies — see CLAUDE.md)
ALTER TABLE "public"."rm_npl_kennzahlen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rm_modelle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rm_modell_validierungen" ENABLE ROW LEVEL SECURITY;
