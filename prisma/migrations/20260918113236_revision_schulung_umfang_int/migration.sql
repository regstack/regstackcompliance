/*
  Warnings:

  - The `umfang` column on the `revision_schulungen` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "revision_schulungen" DROP COLUMN "umfang",
ADD COLUMN     "umfang" INTEGER;
