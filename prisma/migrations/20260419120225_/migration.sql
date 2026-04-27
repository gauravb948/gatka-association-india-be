/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber]` on the table `CoachProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registrationNumber]` on the table `RefereeProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registrationNumber]` on the table `TrainingCenter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registrationNumber]` on the table `VolunteerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "registrationNumber" TEXT;

-- AlterTable
ALTER TABLE "RefereeProfile" ADD COLUMN     "registrationNumber" TEXT;

-- AlterTable
ALTER TABLE "TrainingCenter" ADD COLUMN     "registrationNumber" TEXT;

-- AlterTable
ALTER TABLE "VolunteerProfile" ADD COLUMN     "registrationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_registrationNumber_key" ON "CoachProfile"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RefereeProfile_registrationNumber_key" ON "RefereeProfile"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCenter_registrationNumber_key" ON "TrainingCenter"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerProfile_registrationNumber_key" ON "VolunteerProfile"("registrationNumber");
