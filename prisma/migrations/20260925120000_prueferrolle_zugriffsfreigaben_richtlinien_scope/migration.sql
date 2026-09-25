-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PRUEFER';

-- CreateEnum
CREATE TYPE "AccessModule" AS ENUM ('OUTSOURCING', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "AccessGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PolicyDocumentScope" AS ENUM ('KUNDENRICHTLINIE', 'SOFTWARE_MARISK_NACHWEIS');

-- AlterTable
ALTER TABLE "ics_policy_documents" ADD COLUMN "scope" "PolicyDocumentScope" NOT NULL DEFAULT 'KUNDENRICHTLINIE';

-- CreateTable
CREATE TABLE "module_access_grants" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "module" "AccessModule" NOT NULL,
    "status" "AccessGrantStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3),
    "reason" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_access_grants_institutionId_module_key" ON "module_access_grants"("institutionId", "module");

-- AddForeignKey
ALTER TABLE "module_access_grants" ADD CONSTRAINT "module_access_grants_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity (backend-only, no policies — see 20260919200000_enable_rls_new_module_tables_backend_only)
ALTER TABLE "public"."module_access_grants" ENABLE ROW LEVEL SECURITY;
