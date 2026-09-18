-- CreateEnum
CREATE TYPE "PruefungsobjektCategory" AS ENUM ('geschaeftsorganisation', 'risikomanagement', 'iks', 'sonstige');

-- CreateEnum
CREATE TYPE "ObjektMaterialitaet" AS ENUM ('wesentlich', 'nicht_wesentlich');

-- CreateEnum
CREATE TYPE "PruefungsobjektStatus" AS ENUM ('aktiv', 'inaktiv');

-- CreateEnum
CREATE TYPE "AuditPlanStatus" AS ENUM ('entwurf', 'eingereicht', 'genehmigt');

-- CreateEnum
CREATE TYPE "PruefungStatus" AS ENUM ('geplant', 'laufend', 'abgeschlossen');

-- CreateEnum
CREATE TYPE "Durchfuehrung" AS ENUM ('intern', 'ausgelagert', 'gemischt');

-- CreateEnum
CREATE TYPE "ZuweisungRolle" AS ENUM ('leitung', 'pruefer', 'reviewer');

-- CreateEnum
CREATE TYPE "ArbeitspapierReviewStatus" AS ENUM ('in_arbeit', 'vorgelegt', 'freigegeben', 'nachbesserung');

-- CreateEnum
CREATE TYPE "RevisionsfeststellungStatus" AS ENUM ('offen', 'massnahme_erledigt', 'geschlossen');

-- CreateEnum
CREATE TYPE "AbschlussArt" AS ENUM ('erledigt', 'restrisiko');

-- CreateEnum
CREATE TYPE "ProjektbegleitungStatus" AS ENUM ('laufend', 'abgeschlossen');

-- CreateEnum
CREATE TYPE "QsArt" AS ENUM ('regelmaessig', 'anlassbezogen');

-- CreateEnum
CREATE TYPE "RevisionOrgForm" AS ENUM ('eigene_einheit', 'geschaeftsleiter');

-- CreateEnum
CREATE TYPE "RevisionReportStatus" AS ENUM ('entwurf', 'final');

-- CreateEnum
CREATE TYPE "RevisionsSchweregrad" AS ENUM ('besonders_schwerwiegend', 'schwerwiegend', 'wesentlich', 'geringfuegig');

-- CreateTable
CREATE TABLE "revision_pruefungsobjekte" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "bereich" TEXT,
    "category" "PruefungsobjektCategory" NOT NULL,
    "outsourced" BOOLEAN NOT NULL DEFAULT false,
    "materiality" "ObjektMaterialitaet",
    "risikokriterien" JSONB,
    "riskRationale" JSONB,
    "regAnker" TEXT,
    "verantwortlichUserId" TEXT,
    "status" "PruefungsobjektStatus" NOT NULL DEFAULT 'aktiv',
    "riskReviewDate" TIMESTAMP(3),
    "riskReviewReviewerUserId" TEXT,
    "lastAuditDate" TIMESTAMP(3),
    "planYear" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_pruefungsobjekte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_audit_plans" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" "AuditPlanStatus" NOT NULL DEFAULT 'entwurf',
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_audit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_pruefungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "pruefungsobjektId" TEXT,
    "subject" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" "PruefungStatus" NOT NULL DEFAULT 'geplant',
    "preparedBy" TEXT,
    "reportDate" TIMESTAMP(3),
    "presentedTo" TEXT,
    "presentedDate" TIMESTAMP(3),
    "workpaperRef" TEXT,
    "durchfuehrung" "Durchfuehrung" NOT NULL DEFAULT 'intern',
    "overallRating" TEXT,
    "budgetDays" INTEGER,
    "actualDays" INTEGER,
    "externDienstleister" TEXT,
    "externAblage" TEXT,
    "externEinsicht" JSONB,
    "qsChecklist" JSONB,
    "qsCompletedByUserId" TEXT,
    "qsCompletedAt" TIMESTAMP(3),
    "qsReviewedByUserId" TEXT,
    "qsReviewedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_pruefungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_pruefung_zuweisungen" (
    "id" TEXT NOT NULL,
    "pruefungId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ZuweisungRolle" NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_pruefung_zuweisungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_pruefungsschritte" (
    "id" TEXT NOT NULL,
    "pruefungId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "bereich" TEXT,
    "risiko" TEXT,
    "handlung" TEXT,
    "sollAussage" TEXT,
    "testschritte" TEXT,
    "ergebnis" TEXT,
    "beurteilung" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_pruefungsschritte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_arbeitspapiere" (
    "id" TEXT NOT NULL,
    "schrittId" TEXT NOT NULL,
    "nummer" TEXT,
    "titel" TEXT NOT NULL,
    "typ" TEXT,
    "handlung" TEXT,
    "erstellerUserId" TEXT,
    "erstelltAm" TIMESTAMP(3),
    "inhalt" TEXT,
    "quelle" TEXT,
    "stichprobe" JSONB,
    "ergebnis" TEXT,
    "reviewerUserId" TEXT,
    "reviewAm" TIMESTAMP(3),
    "reviewStatus" "ArbeitspapierReviewStatus" NOT NULL DEFAULT 'in_arbeit',
    "reviewKommentar" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_arbeitspapiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_feststellungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "pruefungsobjektId" TEXT,
    "pruefungId" TEXT,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "schweregrad" "RevisionsSchweregrad",
    "status" "RevisionsfeststellungStatus" NOT NULL DEFAULT 'offen',
    "abschlussArt" "AbschlussArt",
    "verantwortlichUserId" TEXT,
    "fristUrspruenglich" TIMESTAMP(3),
    "executiveTarget" BOOLEAN NOT NULL DEFAULT false,
    "execEscalation" JSONB,
    "escalation" JSONB,
    "nachschauNeeded" BOOLEAN NOT NULL DEFAULT false,
    "nachschauDate" TIMESTAMP(3),
    "stellungnahme" JSONB,
    "abschluss" JSONB,
    "massnahmeErledigtAm" TIMESTAMP(3),
    "massnahmeErledigtVon" TEXT,
    "geschlossenAm" TIMESTAMP(3),
    "geschlossenVon" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_feststellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_fristverlaengerungen" (
    "id" TEXT NOT NULL,
    "feststellungId" TEXT NOT NULL,
    "alt" TIMESTAMP(3),
    "neu" TIMESTAMP(3) NOT NULL,
    "antragsteller" TEXT,
    "genehmiger" TEXT,
    "begruendung" TEXT,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_fristverlaengerungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_personal" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualifikation" TEXT,
    "sollFortbildungTage" INTEGER,
    "nonAuditTasks" TEXT,
    "advisoryActive" BOOLEAN NOT NULL DEFAULT false,
    "advisorySafeguard" TEXT,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_schulungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "umfang" TEXT,
    "nachweisText" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_schulungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_sperrfristen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "fromUnit" TEXT,
    "transferDate" TIMESTAMP(3),
    "barredAreas" TEXT,
    "barEndDate" TIMESTAMP(3),
    "deviation" BOOLEAN NOT NULL DEFAULT false,
    "deviationReason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_sperrfristen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_sonderwissen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "fromUnit" TEXT,
    "topic" TEXT,
    "pruefungId" TEXT,
    "durationText" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_sonderwissen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_einstellungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "orgForm" "RevisionOrgForm",
    "disproportionalityReason" TEXT,
    "conflictMeasures" TEXT,
    "headOfAuditUserId" TEXT,
    "directSubordination" BOOLEAN NOT NULL DEFAULT false,
    "independenceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "severitySettings" JSONB,
    "angemesseneZeitTage" INTEGER NOT NULL DEFAULT 90,
    "qsIntervallMonate" INTEGER,
    "risikoReviewIntervallMonate" INTEGER,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_einstellungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_qualitaetssicherung" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "QsArt" NOT NULL,
    "anlass" TEXT,
    "scope" JSONB,
    "reviewer" TEXT,
    "result" TEXT,
    "nextDue" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_qualitaetssicherung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_projektbegleitung" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ProjektbegleitungStatus" NOT NULL DEFAULT 'laufend',
    "irContactUserId" TEXT,
    "accessGranted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_projektbegleitung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_zugriffsvorfaelle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "area" TEXT,
    "description" TEXT,
    "escalatedTo" TEXT,
    "resolvedDate" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_zugriffsvorfaelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_gl_mitteilungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "decision" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_gl_mitteilungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_sonderauftraege" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "orderedBy" TEXT,
    "subject" TEXT NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_sonderauftraege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_reports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" "RevisionReportStatus" NOT NULL DEFAULT 'entwurf',
    "content" JSONB NOT NULL DEFAULT '{}',
    "finalizedAt" TIMESTAMP(3),
    "kenntnisnahmeByUserId" TEXT,
    "kenntnisnahmeAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_pruefungsobjekte_institutionId_idx" ON "revision_pruefungsobjekte"("institutionId");

-- CreateIndex
CREATE INDEX "revision_audit_plans_institutionId_idx" ON "revision_audit_plans"("institutionId");

-- CreateIndex
CREATE INDEX "revision_pruefungen_institutionId_idx" ON "revision_pruefungen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_pruefungen_pruefungsobjektId_idx" ON "revision_pruefungen"("pruefungsobjektId");

-- CreateIndex
CREATE INDEX "revision_pruefung_zuweisungen_pruefungId_idx" ON "revision_pruefung_zuweisungen"("pruefungId");

-- CreateIndex
CREATE INDEX "revision_pruefungsschritte_pruefungId_idx" ON "revision_pruefungsschritte"("pruefungId");

-- CreateIndex
CREATE INDEX "revision_arbeitspapiere_schrittId_idx" ON "revision_arbeitspapiere"("schrittId");

-- CreateIndex
CREATE INDEX "revision_feststellungen_institutionId_idx" ON "revision_feststellungen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_feststellungen_pruefungsobjektId_idx" ON "revision_feststellungen"("pruefungsobjektId");

-- CreateIndex
CREATE INDEX "revision_feststellungen_pruefungId_idx" ON "revision_feststellungen"("pruefungId");

-- CreateIndex
CREATE INDEX "revision_fristverlaengerungen_feststellungId_idx" ON "revision_fristverlaengerungen"("feststellungId");

-- CreateIndex
CREATE UNIQUE INDEX "revision_personal_userId_key" ON "revision_personal"("userId");

-- CreateIndex
CREATE INDEX "revision_personal_institutionId_idx" ON "revision_personal"("institutionId");

-- CreateIndex
CREATE INDEX "revision_schulungen_institutionId_idx" ON "revision_schulungen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_sperrfristen_institutionId_idx" ON "revision_sperrfristen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_sonderwissen_institutionId_idx" ON "revision_sonderwissen"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "revision_einstellungen_institutionId_key" ON "revision_einstellungen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_qualitaetssicherung_institutionId_idx" ON "revision_qualitaetssicherung"("institutionId");

-- CreateIndex
CREATE INDEX "revision_projektbegleitung_institutionId_idx" ON "revision_projektbegleitung"("institutionId");

-- CreateIndex
CREATE INDEX "revision_zugriffsvorfaelle_institutionId_idx" ON "revision_zugriffsvorfaelle"("institutionId");

-- CreateIndex
CREATE INDEX "revision_gl_mitteilungen_institutionId_idx" ON "revision_gl_mitteilungen"("institutionId");

-- CreateIndex
CREATE INDEX "revision_sonderauftraege_institutionId_idx" ON "revision_sonderauftraege"("institutionId");

-- CreateIndex
CREATE INDEX "revision_reports_institutionId_idx" ON "revision_reports"("institutionId");

-- AddForeignKey
ALTER TABLE "revision_pruefungsobjekte" ADD CONSTRAINT "revision_pruefungsobjekte_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_audit_plans" ADD CONSTRAINT "revision_audit_plans_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_pruefungen" ADD CONSTRAINT "revision_pruefungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_pruefungen" ADD CONSTRAINT "revision_pruefungen_pruefungsobjektId_fkey" FOREIGN KEY ("pruefungsobjektId") REFERENCES "revision_pruefungsobjekte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_pruefung_zuweisungen" ADD CONSTRAINT "revision_pruefung_zuweisungen_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "revision_pruefungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_pruefungsschritte" ADD CONSTRAINT "revision_pruefungsschritte_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "revision_pruefungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_arbeitspapiere" ADD CONSTRAINT "revision_arbeitspapiere_schrittId_fkey" FOREIGN KEY ("schrittId") REFERENCES "revision_pruefungsschritte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_feststellungen" ADD CONSTRAINT "revision_feststellungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_feststellungen" ADD CONSTRAINT "revision_feststellungen_pruefungsobjektId_fkey" FOREIGN KEY ("pruefungsobjektId") REFERENCES "revision_pruefungsobjekte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_feststellungen" ADD CONSTRAINT "revision_feststellungen_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "revision_pruefungen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_fristverlaengerungen" ADD CONSTRAINT "revision_fristverlaengerungen_feststellungId_fkey" FOREIGN KEY ("feststellungId") REFERENCES "revision_feststellungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_personal" ADD CONSTRAINT "revision_personal_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_schulungen" ADD CONSTRAINT "revision_schulungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_sperrfristen" ADD CONSTRAINT "revision_sperrfristen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_sonderwissen" ADD CONSTRAINT "revision_sonderwissen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_sonderwissen" ADD CONSTRAINT "revision_sonderwissen_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "revision_pruefungen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_einstellungen" ADD CONSTRAINT "revision_einstellungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_qualitaetssicherung" ADD CONSTRAINT "revision_qualitaetssicherung_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_projektbegleitung" ADD CONSTRAINT "revision_projektbegleitung_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_zugriffsvorfaelle" ADD CONSTRAINT "revision_zugriffsvorfaelle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_gl_mitteilungen" ADD CONSTRAINT "revision_gl_mitteilungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_sonderauftraege" ADD CONSTRAINT "revision_sonderauftraege_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_reports" ADD CONSTRAINT "revision_reports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
