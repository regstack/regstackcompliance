-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_activityId_fkey";

-- DropForeignKey
ALTER TABLE "handlungsoption_records" DROP CONSTRAINT "handlungsoption_records_activityId_fkey";

-- DropForeignKey
ALTER TABLE "monitoring_records" DROP CONSTRAINT "monitoring_records_activityId_fkey";

-- DropForeignKey
ALTER TABLE "registry_entries" DROP CONSTRAINT "registry_entries_activityId_fkey";

-- DropForeignKey
ALTER TABLE "risk_analyses" DROP CONSTRAINT "risk_analyses_activityId_fkey";

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "clauseJustifications" JSONB NOT NULL DEFAULT '{}';

-- AddForeignKey
ALTER TABLE "risk_analyses" ADD CONSTRAINT "risk_analyses_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handlungsoption_records" ADD CONSTRAINT "handlungsoption_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registry_entries" ADD CONSTRAINT "registry_entries_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "outsourcing_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
