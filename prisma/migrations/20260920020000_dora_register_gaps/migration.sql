-- CreateEnum
CREATE TYPE "IctSubcontractingStatus" AS ENUM ('AKTIV', 'ENTFERNT');

-- AlterTable
ALTER TABLE "ict_arrangements" ADD COLUMN "annualCostEur" DOUBLE PRECISION,
ADD COLUMN "exitStrategyNote" TEXT;

-- CreateTable
CREATE TABLE "ict_services" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "arrangementId" TEXT NOT NULL,
    "serviceDescription" TEXT NOT NULL,
    "serviceLevelObjective" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ict_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ict_subcontracting" (
    "id" TEXT NOT NULL,
    "arrangementId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "country" TEXT,
    "description" TEXT,
    "status" "IctSubcontractingStatus" NOT NULL DEFAULT 'AKTIV',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ict_subcontracting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ict_services_institutionId_idx" ON "ict_services"("institutionId");

-- CreateIndex
CREATE INDEX "ict_services_arrangementId_idx" ON "ict_services"("arrangementId");

-- CreateIndex
CREATE INDEX "ict_subcontracting_arrangementId_idx" ON "ict_subcontracting"("arrangementId");

-- CreateIndex
CREATE INDEX "ict_subcontracting_parentId_idx" ON "ict_subcontracting"("parentId");

-- AddForeignKey
ALTER TABLE "ict_services" ADD CONSTRAINT "ict_services_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ict_services" ADD CONSTRAINT "ict_services_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "ict_arrangements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ict_subcontracting" ADD CONSTRAINT "ict_subcontracting_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "ict_arrangements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ict_subcontracting" ADD CONSTRAINT "ict_subcontracting_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ict_subcontracting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
