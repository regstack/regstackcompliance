-- AlterEnum
ALTER TYPE "EvidenceModule" ADD VALUE 'RISK_MANAGEMENT';
ALTER TYPE "EvidenceModule" ADD VALUE 'IT_RISK';

-- AlterTable
ALTER TABLE "nachweise" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "nachweise" ADD COLUMN "fileMime" TEXT;
