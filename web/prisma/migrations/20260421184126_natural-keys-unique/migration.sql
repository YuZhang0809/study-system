-- CreateIndex
CREATE UNIQUE INDEX "PlanSegment_projectId_order_key" ON "PlanSegment"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
