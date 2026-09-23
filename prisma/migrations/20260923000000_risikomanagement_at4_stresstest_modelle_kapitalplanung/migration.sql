-- CreateEnum
CREATE TYPE "RmModellKomplexitaet" AS ENUM ('einfach', 'komplex');

-- CreateEnum
CREATE TYPE "RmStresstestTyp" AS ENUM ('sensitivitaetsanalyse', 'szenarioanalyse_historisch', 'szenarioanalyse_hypothetisch', 'schwerer_konjunktureller_abschwung', 'inverser_stresstest', 'resilienzanalyse');

-- CreateEnum
CREATE TYPE "RmStresstestEbene" AS ENUM ('gesamtinstitut', 'risikoart', 'portfolio', 'geschaeftsbereich');

-- CreateTable
CREATE TABLE "rm_kapitalplanung" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "planungshorizontJahre" INTEGER NOT NULL,
    "kapitalbedarfPlanung" JSONB NOT NULL DEFAULT '{}',
    "verfuegbaresKapitalPlanung" JSONB NOT NULL DEFAULT '{}',
    "adverseSzenarienBeruecksichtigt" BOOLEAN NOT NULL DEFAULT false,
    "konsistenzGeschaeftsplanung" TEXT,
    "anlassbezogenAktualisiertAm" TIMESTAMP(3),
    "verabschiedetAm" TIMESTAMP(3),
    "verabschiedetVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_kapitalplanung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_stresstests" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "typ" "RmStresstestTyp" NOT NULL,
    "ebene" "RmStresstestEbene" NOT NULL DEFAULT 'gesamtinstitut',
    "betroffeneRisikoarten" "RisikoartKategorie"[],
    "szenariobeschreibung" TEXT NOT NULL,
    "risikofaktoren" TEXT,
    "wechselwirkungenBeruecksichtigt" BOOLEAN NOT NULL DEFAULT false,
    "ergebnis" TEXT,
    "rtfBeruecksichtigt" BOOLEAN NOT NULL DEFAULT false,
    "handlungsbedarf" TEXT,
    "durchgefuehrtAm" TIMESTAMP(3) NOT NULL,
    "angemessenheitGeprueftAm" TIMESTAMP(3),
    "verantwortlichUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_stresstests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_modelle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "verwendungszweck" TEXT NOT NULL,
    "komplexitaet" "RmModellKomplexitaet" NOT NULL DEFAULT 'einfach',
    "technologiegestuetzteInnovationOderKi" BOOLEAN NOT NULL DEFAULT false,
    "wesentlicheAnnahmen" TEXT,
    "datenqualitaetspruefung" TEXT,
    "ueberschreibungsregelung" TEXT,
    "erklaerbarkeitsbewertung" TEXT,
    "externerDienstleister" BOOLEAN NOT NULL DEFAULT false,
    "validierungUnabhaengig" BOOLEAN NOT NULL DEFAULT false,
    "initialvalidierungAm" TIMESTAMP(3),
    "letzteValidierungAm" TIMESTAMP(3),
    "naechsteValidierungFaellig" TIMESTAMP(3),
    "validierungsergebnis" TEXT,
    "verantwortlichUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_modelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_kapitalplanung_institutionId_idx" ON "rm_kapitalplanung"("institutionId");

-- CreateIndex
CREATE INDEX "rm_stresstests_institutionId_idx" ON "rm_stresstests"("institutionId");

-- CreateIndex
CREATE INDEX "rm_modelle_institutionId_idx" ON "rm_modelle"("institutionId");

-- AddForeignKey
ALTER TABLE "rm_kapitalplanung" ADD CONSTRAINT "rm_kapitalplanung_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_stresstests" ADD CONSTRAINT "rm_stresstests_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_modelle" ADD CONSTRAINT "rm_modelle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Row Level Security is enabled on every table as defense-in-depth (backend-only, no policies —
-- see 20260919190000_enable_rls_backend_only); every new module table gets the same treatment.
ALTER TABLE "public"."rm_kapitalplanung" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rm_stresstests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rm_modelle" ENABLE ROW LEVEL SECURITY;
