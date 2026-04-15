/*
  Warnings:

  - You are about to drop the column `headAadharBackUrl` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headAadharFrontUrl` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headAadharNumber` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headName` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headPassportPhotoUrl` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `registrarNumber` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `registrationCertificateUrl` on the `DistrictRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headAadharBackUrl` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headAadharFrontUrl` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headAadharNumber` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headName` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `headPassportPhotoUrl` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `registrarNumber` on the `StateRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `registrationCertificateUrl` on the `StateRegistration` table. All the data in the column will be lost.
  - Added the required column `email` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobileNo` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateId` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `DistrictRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobileNo` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `StateRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DistrictRegistration" DROP COLUMN "headAadharBackUrl",
DROP COLUMN "headAadharFrontUrl",
DROP COLUMN "headAadharNumber",
DROP COLUMN "headName",
DROP COLUMN "headPassportPhotoUrl",
DROP COLUMN "phone",
DROP COLUMN "registrarNumber",
DROP COLUMN "registrationCertificateUrl",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "mobileNo" TEXT NOT NULL,
ADD COLUMN     "passportPhotoUrl" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "stateId" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StateRegistration" DROP COLUMN "headAadharBackUrl",
DROP COLUMN "headAadharFrontUrl",
DROP COLUMN "headAadharNumber",
DROP COLUMN "headName",
DROP COLUMN "headPassportPhotoUrl",
DROP COLUMN "phone",
DROP COLUMN "registrarNumber",
DROP COLUMN "registrationCertificateUrl",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "mobileNo" TEXT NOT NULL,
ADD COLUMN     "passportPhotoUrl" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "DistrictRegistration_stateId_idx" ON "DistrictRegistration"("stateId");

-- CreateIndex
CREATE INDEX "DistrictRegistration_email_idx" ON "DistrictRegistration"("email");

-- CreateIndex
CREATE INDEX "DistrictRegistration_userName_idx" ON "DistrictRegistration"("userName");

-- CreateIndex
CREATE INDEX "StateRegistration_email_idx" ON "StateRegistration"("email");

-- CreateIndex
CREATE INDEX "StateRegistration_userName_idx" ON "StateRegistration"("userName");

-- AddForeignKey
ALTER TABLE "DistrictRegistration" ADD CONSTRAINT "DistrictRegistration_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
