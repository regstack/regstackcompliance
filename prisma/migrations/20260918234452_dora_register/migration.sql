-- CreateEnum
CREATE TYPE "DoraArrangementStatus" AS ENUM ('ENTWURF', 'AKTIV', 'BEENDET');

-- CreateEnum
CREATE TYPE "DoraSubOutsourcingStatus" AS ENUM ('AKTIV', 'ENTFERNT');

-- CreateEnum
CREATE TYPE "DoraRegisterLevel" AS ENUM ('ENTITY', 'SUB_CONSOLIDATED', 'CONSOLIDATED');

-- CreateTable
CREATE TABLE "dora_ict_arrangements" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "activityId" TEXT,
    "registerLevel" "DoraRegisterLevel" NOT NULL DEFAULT 'ENTITY',
    "providerName" TEXT NOT NULL,
    "providerLei" TEXT,
    "providerCountry" TEXT,
    "providerAddress" TEXT,
    "serviceType" TEXT NOT NULL,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "terminationNoticeMonths" INTEGER,
    "criticalOrImportantFunction" BOOLEAN NOT NULL DEFAULT false,
    "criticalityRationale" TEXT,
    "isCriticalIctProvider" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingCountries" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDueAt" TIMESTAMP(3),
    "status" "DoraArrangementStatus" NOT NULL DEFAULT 'ENTWURF',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dora_ict_arrangements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dora_weiterverlagerungen" (
    "id" TEXT NOT NULL,
    "arrangementId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "country" TEXT,
    "description" TEXT,
    "status" "DoraSubOutsourcingStatus" NOT NULL DEFAULT 'AKTIV',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dora_weiterverlagerungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dora_ict_arrangements_activityId_key" ON "dora_ict_arrangements"("activityId");

-- CreateIndex
CREATE INDEX "dora_ict_arrangements_institutionId_idx" ON "dora_ict_arrangements"("institutionId");

-- CreateIndex
CREATE INDEX "dora_weiterverlagerungen_arrangementId_idx" ON "dora_weiterverlagerungen"("arrangementId");

-- CreateIndex
CREATE INDEX "dora_weiterverlagerungen_parentId_idx" ON "dora_weiterverlagerungen"("parentId");

-- AddForeignKey
ALTER TABLE "dora_ict_arrangements" ADD CONSTRAINT "dora_ict_arrangements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dora_ict_arrangements" ADD CONSTRAINT "dora_ict_arrangements_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dora_weiterverlagerungen" ADD CONSTRAINT "dora_weiterverlagerungen_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "dora_ict_arrangements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dora_weiterverlagerungen" ADD CONSTRAINT "dora_weiterverlagerungen_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "dora_weiterverlagerungen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
