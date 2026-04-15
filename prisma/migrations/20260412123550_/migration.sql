/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `DistrictRegistration` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `StateRegistration` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DistrictRegistration" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "StateRegistration" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DistrictRegistration_userId_key" ON "DistrictRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StateRegistration_userId_key" ON "StateRegistration"("userId");

-- AddForeignKey
ALTER TABLE "StateRegistration" ADD CONSTRAINT "StateRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictRegistration" ADD CONSTRAINT "DistrictRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
