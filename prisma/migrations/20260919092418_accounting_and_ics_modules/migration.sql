-- CreateEnum
CREATE TYPE "AccountingDocStatus" AS ENUM ('entwurf', 'final');

-- CreateEnum
CREATE TYPE "AccountingDocumentType" AS ENUM ('BILANZ', 'GUV', 'ANHANG', 'LAGEBERICHT');

-- CreateEnum
CREATE TYPE "BilanzSeite" AS ENUM ('AKTIVA', 'PASSIVA');

-- CreateEnum
CREATE TYPE "BilanzSection" AS ENUM ('ANLAGEVERMOEGEN', 'UMLAUFVERMOEGEN', 'RECHNUNGSABGRENZUNG_AKTIVA', 'EIGENKAPITAL', 'RUECKSTELLUNGEN', 'VERBINDLICHKEITEN', 'RECHNUNGSABGRENZUNG_PASSIVA');

-- CreateEnum
CREATE TYPE "GuvSection" AS ENUM ('ERTRAEGE', 'AUFWENDUNGEN', 'ERGEBNIS');

-- CreateEnum
CREATE TYPE "IcsControlType" AS ENUM ('ITGC', 'AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "IcsControlFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'AD_HOC', 'PER_TRANSACTION');

-- CreateEnum
CREATE TYPE "IcsControlTestStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IcsControlTestResult" AS ENUM ('EFFECTIVE', 'DEFICIENT', 'NOT_TESTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BUCHHALTUNG';

-- CreateTable
CREATE TABLE "accounting_balance_sheets" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "periodLabel" TEXT,
    "status" "AccountingDocStatus" NOT NULL DEFAULT 'entwurf',
    "finalizedAt" TIMESTAMP(3),
    "previousVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_balance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_balance_sheet_line_items" (
    "id" TEXT NOT NULL,
    "balanceSheetId" TEXT NOT NULL,
    "side" "BilanzSeite" NOT NULL,
    "section" "BilanzSection" NOT NULL,
    "label" TEXT NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL,
    "priorYearAmount" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accounting_balance_sheet_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_income_statements" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "periodLabel" TEXT,
    "status" "AccountingDocStatus" NOT NULL DEFAULT 'entwurf',
    "finalizedAt" TIMESTAMP(3),
    "previousVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_income_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_income_statement_line_items" (
    "id" TEXT NOT NULL,
    "incomeStatementId" TEXT NOT NULL,
    "section" "GuvSection" NOT NULL,
    "label" TEXT NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL,
    "priorYearAmount" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accounting_income_statement_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_notes" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" "AccountingDocStatus" NOT NULL DEFAULT 'entwurf',
    "finalizedAt" TIMESTAMP(3),
    "previousVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_notes_sections" (
    "id" TEXT NOT NULL,
    "notesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "linkedLineItemLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accounting_notes_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_management_reports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" "AccountingDocStatus" NOT NULL DEFAULT 'entwurf',
    "finalizedAt" TIMESTAMP(3),
    "previousVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_management_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_management_report_sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accounting_management_report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_sign_offs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "documentType" "AccountingDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_sign_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_business_processes" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "description" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ics_business_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_controls" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "controlType" "IcsControlType" NOT NULL,
    "description" TEXT,
    "frequency" "IcsControlFrequency" NOT NULL,
    "controlOwnerUserId" TEXT,
    "risksAddressed" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ics_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_control_processes" (
    "controlId" TEXT NOT NULL,
    "businessProcessId" TEXT NOT NULL,

    CONSTRAINT "ics_control_processes_pkey" PRIMARY KEY ("controlId","businessProcessId")
);

-- CreateTable
CREATE TABLE "ics_control_tests" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "plannedPeriod" TEXT,
    "plannedDate" TIMESTAMP(3),
    "status" "IcsControlTestStatus" NOT NULL DEFAULT 'PLANNED',
    "result" "IcsControlTestResult",
    "resultNotes" TEXT,
    "testedByUserId" TEXT,
    "testedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ics_control_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_control_test_evidence" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "fileObjectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileMime" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ics_control_test_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_policy_documents" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentType" TEXT,
    "fileObjectKey" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileMime" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ics_policy_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ics_policy_processes" (
    "policyDocumentId" TEXT NOT NULL,
    "businessProcessId" TEXT NOT NULL,

    CONSTRAINT "ics_policy_processes_pkey" PRIMARY KEY ("policyDocumentId","businessProcessId")
);

-- CreateTable
CREATE TABLE "ics_policy_controls" (
    "policyDocumentId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,

    CONSTRAINT "ics_policy_controls_pkey" PRIMARY KEY ("policyDocumentId","controlId")
);

-- CreateIndex
CREATE INDEX "accounting_balance_sheets_institutionId_fiscalYear_idx" ON "accounting_balance_sheets"("institutionId", "fiscalYear");

-- CreateIndex
CREATE INDEX "accounting_balance_sheet_line_items_balanceSheetId_idx" ON "accounting_balance_sheet_line_items"("balanceSheetId");

-- CreateIndex
CREATE INDEX "accounting_income_statements_institutionId_fiscalYear_idx" ON "accounting_income_statements"("institutionId", "fiscalYear");

-- CreateIndex
CREATE INDEX "accounting_income_statement_line_items_incomeStatementId_idx" ON "accounting_income_statement_line_items"("incomeStatementId");

-- CreateIndex
CREATE INDEX "accounting_notes_institutionId_fiscalYear_idx" ON "accounting_notes"("institutionId", "fiscalYear");

-- CreateIndex
CREATE INDEX "accounting_notes_sections_notesId_idx" ON "accounting_notes_sections"("notesId");

-- CreateIndex
CREATE INDEX "accounting_management_reports_institutionId_fiscalYear_idx" ON "accounting_management_reports"("institutionId", "fiscalYear");

-- CreateIndex
CREATE INDEX "accounting_management_report_sections_reportId_idx" ON "accounting_management_report_sections"("reportId");

-- CreateIndex
CREATE INDEX "accounting_sign_offs_institutionId_idx" ON "accounting_sign_offs"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_sign_offs_documentType_documentId_userId_key" ON "accounting_sign_offs"("documentType", "documentId", "userId");

-- CreateIndex
CREATE INDEX "ics_business_processes_institutionId_idx" ON "ics_business_processes"("institutionId");

-- CreateIndex
CREATE INDEX "ics_controls_institutionId_idx" ON "ics_controls"("institutionId");

-- CreateIndex
CREATE INDEX "ics_control_tests_controlId_idx" ON "ics_control_tests"("controlId");

-- CreateIndex
CREATE INDEX "ics_control_test_evidence_testId_idx" ON "ics_control_test_evidence"("testId");

-- CreateIndex
CREATE INDEX "ics_policy_documents_institutionId_idx" ON "ics_policy_documents"("institutionId");

-- AddForeignKey
ALTER TABLE "accounting_balance_sheets" ADD CONSTRAINT "accounting_balance_sheets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_balance_sheets" ADD CONSTRAINT "accounting_balance_sheets_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "accounting_balance_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_balance_sheet_line_items" ADD CONSTRAINT "accounting_balance_sheet_line_items_balanceSheetId_fkey" FOREIGN KEY ("balanceSheetId") REFERENCES "accounting_balance_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_income_statements" ADD CONSTRAINT "accounting_income_statements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_income_statements" ADD CONSTRAINT "accounting_income_statements_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "accounting_income_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_income_statement_line_items" ADD CONSTRAINT "accounting_income_statement_line_items_incomeStatementId_fkey" FOREIGN KEY ("incomeStatementId") REFERENCES "accounting_income_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_notes" ADD CONSTRAINT "accounting_notes_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_notes" ADD CONSTRAINT "accounting_notes_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "accounting_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_notes_sections" ADD CONSTRAINT "accounting_notes_sections_notesId_fkey" FOREIGN KEY ("notesId") REFERENCES "accounting_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_management_reports" ADD CONSTRAINT "accounting_management_reports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_management_reports" ADD CONSTRAINT "accounting_management_reports_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "accounting_management_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_management_report_sections" ADD CONSTRAINT "accounting_management_report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "accounting_management_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_sign_offs" ADD CONSTRAINT "accounting_sign_offs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_business_processes" ADD CONSTRAINT "ics_business_processes_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_controls" ADD CONSTRAINT "ics_controls_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_control_processes" ADD CONSTRAINT "ics_control_processes_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ics_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_control_processes" ADD CONSTRAINT "ics_control_processes_businessProcessId_fkey" FOREIGN KEY ("businessProcessId") REFERENCES "ics_business_processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_control_tests" ADD CONSTRAINT "ics_control_tests_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ics_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_control_test_evidence" ADD CONSTRAINT "ics_control_test_evidence_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ics_control_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_policy_documents" ADD CONSTRAINT "ics_policy_documents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_policy_processes" ADD CONSTRAINT "ics_policy_processes_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "ics_policy_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_policy_processes" ADD CONSTRAINT "ics_policy_processes_businessProcessId_fkey" FOREIGN KEY ("businessProcessId") REFERENCES "ics_business_processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_policy_controls" ADD CONSTRAINT "ics_policy_controls_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "ics_policy_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ics_policy_controls" ADD CONSTRAINT "ics_policy_controls_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ics_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
