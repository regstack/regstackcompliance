-- CreateEnum
CREATE TYPE "WeiterverlagerungStatus" AS ENUM ('AKTIV', 'ENTFERNT');

-- AlterEnum
ALTER TYPE "ActivityStatus" ADD VALUE 'BEENDET';

-- AlterTable
ALTER TABLE "monitoring_records" ADD COLUMN     "assuranceType" TEXT,
ADD COLUMN     "bridgeCoverage" TEXT,
ADD COLUMN     "changeNote" TEXT,
ADD COLUMN     "materialChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewerName" TEXT;

-- DropEnum
DROP TYPE "ContractItemStatus";

-- CreateTable
CREATE TABLE "weiterverlagerungen" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "country" TEXT,
    "description" TEXT,
    "status" "WeiterverlagerungStatus" NOT NULL DEFAULT 'AKTIV',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weiterverlagerungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weiterverlagerungen_activityId_idx" ON "weiterverlagerungen"("activityId");

-- CreateIndex
CREATE INDEX "weiterverlagerungen_parentId_idx" ON "weiterverlagerungen"("parentId");

-- AddForeignKey
ALTER TABLE "weiterverlagerungen" ADD CONSTRAINT "weiterverlagerungen_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weiterverlagerungen" ADD CONSTRAINT "weiterverlagerungen_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "weiterverlagerungen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
