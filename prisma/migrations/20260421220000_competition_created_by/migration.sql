-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Competition_createdById_idx" ON "Competition"("createdById");
