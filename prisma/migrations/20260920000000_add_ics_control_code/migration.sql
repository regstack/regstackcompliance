-- AlterTable
ALTER TABLE "ics_controls" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ics_controls_institutionId_code_key" ON "ics_controls"("institutionId", "code");
