-- RegStack init migration — hand-authored to match prisma/schema.prisma exactly, since this
-- scaffolding environment has no reachable Postgres to run `prisma migrate dev` against.
-- Once a real DB is reachable, verify with: npx prisma migrate diff
--   --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$DATABASE_URL"
-- which should report "No difference detected" if this file is correct.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GESCHAEFTSLEITUNG', 'COMPLIANCE', 'RISIKOCONTROLLING', 'INTERNE_REVISION', 'AUSLAGERUNGSBEAUFTRAGTER', 'ADMIN', 'VIEWER');
CREATE TYPE "SizeClass" AS ENUM ('SEHR_KLEIN', 'KLEIN', 'MITTEL', 'GROSS');
CREATE TYPE "CalculationModel" AS ENUM ('CSC', 'TESLA');
CREATE TYPE "ScopeType" AS ENUM ('AUSLAGERUNG', 'SONSTIGER_FREMDBEZUG', 'IKT_DORA');
CREATE TYPE "SpecialFunction" AS ENUM ('KEINE', 'RISIKOCONTROLLING', 'COMPLIANCE', 'INTERNE_REVISION', 'KERNBANKBEREICH');
CREATE TYPE "ActivityStatus" AS ENUM ('ENTWURF', 'AKTIV');
CREATE TYPE "CriticalityAssessment" AS ENUM ('OFFEN', 'KRITISCH', 'NICHT_KRITISCH');
CREATE TYPE "ErsetzbarkeitOption" AS ENUM ('LEICHT', 'SCHWIERIG', 'UNMOEGLICH');
CREATE TYPE "HandlungsoptionStatus" AS ENUM ('ADOPTED_OPTIONS', 'EXIT_STRATEGY', 'BCM_LINKED');
CREATE TYPE "ContractItemStatus" AS ENUM ('ERFUELLT', 'NICHT_ERFORDERLICH', 'OFFEN');
CREATE TYPE "MonitoringType" AS ENUM ('EVIDENCE_LOG', 'KPI');
CREATE TYPE "ReportFormat" AS ENUM ('SCHRIFTLICHER_BERICHT', 'VORSTANDSSITZUNGSPROTOKOLL');
CREATE TYPE "ReportStatus" AS ENUM ('ENTWURF', 'GENEHMIGT');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "institution_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeClass" "SizeClass" NOT NULL DEFAULT 'KLEIN',
    "groupRelief" BOOLEAN NOT NULL DEFAULT false,
    "reviewCycleYears" INTEGER NOT NULL DEFAULT 3,
    "calculationModel" "CalculationModel" NOT NULL DEFAULT 'CSC',
    "cscMaterialityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "cscImpactThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.75,
    "teslaLogicAnd" BOOLEAN NOT NULL DEFAULT false,
    "teslaThreshold" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "revisionsbeauftragterName" TEXT,
    "revisionsbeauftragterIstGeschaeftsleiter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "institution_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outsourcing_activities" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT,
    "bafinReferenceNumber" TEXT,
    "scope" "ScopeType" NOT NULL,
    "scopeJustification" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "terminationNoticeMonths" INTEGER,
    "serviceLocations" TEXT,
    "dataCategories" TEXT,
    "isCloud" BOOLEAN NOT NULL DEFAULT false,
    "isSubOutsourcing" BOOLEAN NOT NULL DEFAULT false,
    "groupInternal" BOOLEAN NOT NULL DEFAULT false,
    "specialFunction" "SpecialFunction" NOT NULL DEFAULT 'KEINE',
    "deepDive" BOOLEAN NOT NULL DEFAULT false,
    "status" "ActivityStatus" NOT NULL DEFAULT 'ENTWURF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outsourcing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_analyses" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "quickTriggers" JSONB NOT NULL DEFAULT '{}',
    "materialityRatings" JSONB NOT NULL DEFAULT '{}',
    "secondDimensionRatings" JSONB NOT NULL DEFAULT '{}',
    "materialityScore" DOUBLE PRECISION,
    "secondScore" DOUBLE PRECISION,
    "inherentScore" DOUBLE PRECISION,
    "computedMaterial" BOOLEAN,
    "criticalSuggestion" BOOLEAN,
    "materiality" BOOLEAN,
    "criticality" "CriticalityAssessment" NOT NULL DEFAULT 'OFFEN',
    "criticalityReason" TEXT,
    "overrideActive" BOOLEAN NOT NULL DEFAULT false,
    "overrideMaterial" BOOLEAN,
    "overrideCritical" BOOLEAN,
    "overrideReason" TEXT,
    "overrideApprover" TEXT,
    "overrideDate" TIMESTAMP(3),
    "integrationFeasibilityAnswers" JSONB,
    "integrationFeasibilityNotes" TEXT,
    "scenarioPerformed" BOOLEAN NOT NULL DEFAULT false,
    "scenarioNotes" TEXT,
    "adHocTrigger" BOOLEAN NOT NULL DEFAULT false,
    "adHocNote" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewDueAt" TIMESTAMP(3),
    "classifiedByUserId" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "risk_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "fileObjectKey" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileMime" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "uploadedByUserId" TEXT,
    "clauseChecklist" JSONB NOT NULL DEFAULT '{}',
    "subOutsourcingChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handlungsoption_records" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "status" "HandlungsoptionStatus",
    "strategyDescription" TEXT,
    "ersetzbarkeit" "ErsetzbarkeitOption",
    "transitionMonths" INTEGER,
    "reviewDate" TIMESTAMP(3),
    "depApprover" TEXT,
    "depDate" TIMESTAMP(3),
    "depControls" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "handlungsoption_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registry_entries" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedFields" JSONB NOT NULL,
    "exportedByUserId" TEXT,
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "registry_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_records" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" "MonitoringType" NOT NULL,
    "evidenceDate" TIMESTAMP(3),
    "evidenceDescription" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "escalationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "escalationNote" TEXT,
    "assuranceReportDueDate" TIMESTAMP(3),
    "kpiName" TEXT,
    "kpiTarget" TEXT,
    "kpiAchieved" TEXT,
    "kpiComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monitoring_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conclusionContract" TEXT NOT NULL,
    "conclusionSteuerbarkeit" TEXT NOT NULL,
    "conclusionMassnahmen" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'SCHRIFTLICHER_BERICHT',
    "includedActivityIds" JSONB NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'ENTWURF',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_events" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "changedFields" JSONB,
    "previousValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_institutionId_idx" ON "users"("institutionId");
CREATE INDEX "outsourcing_activities_institutionId_idx" ON "outsourcing_activities"("institutionId");
CREATE UNIQUE INDEX "risk_analyses_activityId_key" ON "risk_analyses"("activityId");
CREATE UNIQUE INDEX "contracts_activityId_key" ON "contracts"("activityId");
CREATE UNIQUE INDEX "handlungsoption_records_activityId_key" ON "handlungsoption_records"("activityId");
CREATE INDEX "registry_entries_activityId_idx" ON "registry_entries"("activityId");
CREATE INDEX "monitoring_records_activityId_idx" ON "monitoring_records"("activityId");
CREATE INDEX "reports_institutionId_idx" ON "reports"("institutionId");
CREATE INDEX "audit_log_events_entityType_entityId_idx" ON "audit_log_events"("entityType", "entityId");
CREATE INDEX "audit_log_events_actorUserId_idx" ON "audit_log_events"("actorUserId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outsourcing_activities" ADD CONSTRAINT "outsourcing_activities_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "risk_analyses" ADD CONSTRAINT "risk_analyses_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handlungsoption_records" ADD CONSTRAINT "handlungsoption_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry_entries" ADD CONSTRAINT "registry_entries_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log_events" ADD CONSTRAINT "audit_log_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
