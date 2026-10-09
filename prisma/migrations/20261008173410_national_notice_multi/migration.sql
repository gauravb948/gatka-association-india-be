-- AlterTable
ALTER TABLE "NationalNotice" DROP COLUMN "title",
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "NationalNotice_display_idx" ON "NationalNotice"("display");

-- CreateIndex
CREATE INDEX "NationalNotice_sortOrder_idx" ON "NationalNotice"("sortOrder");

