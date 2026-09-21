-- CreateEnum
CREATE TYPE "AufsichtsorganBerichtStatus" AS ENUM ('entwurf', 'final', 'versendet');

-- CreateTable
CREATE TABLE "rm_aufsichtsorgan_berichte" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" "AufsichtsorganBerichtStatus" NOT NULL DEFAULT 'entwurf',
    "content" JSONB NOT NULL DEFAULT '{}',
    "finalizedAt" TIMESTAMP(3),
    "versendetAm" TIMESTAMP(3),
    "versendetVonUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rm_aufsichtsorgan_berichte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_aufsichtsorgan_berichte_institutionId_idx" ON "rm_aufsichtsorgan_berichte"("institutionId");

-- AddForeignKey
ALTER TABLE "rm_aufsichtsorgan_berichte" ADD CONSTRAINT "rm_aufsichtsorgan_berichte_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
