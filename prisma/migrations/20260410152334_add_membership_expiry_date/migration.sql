-- AlterTable
ALTER TABLE "GlobalSettings" ADD COLUMN     "membershipExpiryDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PagesContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detailedDescription" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagesContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagesContent_stateId_idx" ON "PagesContent"("stateId");

-- CreateIndex
CREATE INDEX "PagesContent_isEnabled_idx" ON "PagesContent"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "PagesContent_stateId_page_key" ON "PagesContent"("stateId", "page");

-- AddForeignKey
ALTER TABLE "PagesContent" ADD CONSTRAINT "PagesContent_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
