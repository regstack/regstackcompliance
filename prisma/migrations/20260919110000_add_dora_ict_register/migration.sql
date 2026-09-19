-- CreateEnum
CREATE TYPE "IctProviderType" AS ENUM ('DIREKT', 'KONZERNINTERN');

-- CreateEnum
CREATE TYPE "IctArrangementStatus" AS ENUM ('AKTIV', 'BEENDET');

-- CreateTable
CREATE TABLE "ict_providers" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalEntityIdentifier" TEXT,
    "country" TEXT,
    "providerType" "IctProviderType" NOT NULL DEFAULT 'DIREKT',
    "parentUndertaking" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ict_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ict_arrangements" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "functionDescription" TEXT NOT NULL,
    "supportsCriticalFunction" BOOLEAN NOT NULL DEFAULT false,
    "criticalityReason" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "terminationNoticeMonths" INTEGER,
    "dataCategories" TEXT,
    "hasSubcontracting" BOOLEAN NOT NULL DEFAULT false,
    "subcontractingNote" TEXT,
    "status" "IctArrangementStatus" NOT NULL DEFAULT 'AKTIV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ict_arrangements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ict_providers_institutionId_idx" ON "ict_providers"("institutionId");

-- CreateIndex
CREATE INDEX "ict_arrangements_institutionId_idx" ON "ict_arrangements"("institutionId");

-- CreateIndex
CREATE INDEX "ict_arrangements_providerId_idx" ON "ict_arrangements"("providerId");

-- AddForeignKey
ALTER TABLE "ict_providers" ADD CONSTRAINT "ict_providers_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ict_arrangements" ADD CONSTRAINT "ict_arrangements_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ict_arrangements" ADD CONSTRAINT "ict_arrangements_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ict_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
