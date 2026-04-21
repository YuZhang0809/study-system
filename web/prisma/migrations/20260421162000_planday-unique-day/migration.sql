-- DropIndex
DROP INDEX "PlanDay_projectId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PlanDay_projectId_date_key" ON "PlanDay"("projectId", "date");
