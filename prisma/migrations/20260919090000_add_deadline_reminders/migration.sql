-- CreateTable
CREATE TABLE "deadline_reminders" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "thresholdDays" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deadline_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deadline_reminders_entityType_entityId_thresholdDays_key" ON "deadline_reminders"("entityType", "entityId", "thresholdDays");
