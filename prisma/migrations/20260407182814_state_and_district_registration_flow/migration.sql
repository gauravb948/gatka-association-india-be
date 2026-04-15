/*
  Warnings:

  - You are about to drop the column `status` on the `District` table. All the data in the column will be lost.
  - You are about to drop the column `statusReason` on the `District` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `State` table. All the data in the column will be lost.
  - You are about to drop the column `statusReason` on the `State` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentPurpose" ADD VALUE 'STATE_REGISTRATION';
ALTER TYPE "PaymentPurpose" ADD VALUE 'DISTRICT_REGISTRATION';

-- AlterTable
ALTER TABLE "District" DROP COLUMN "status",
DROP COLUMN "statusReason",
ALTER COLUMN "isEnabled" SET DEFAULT false;

-- AlterTable
ALTER TABLE "State" DROP COLUMN "status",
DROP COLUMN "statusReason",
ALTER COLUMN "isEnabled" SET DEFAULT false;

-- CreateTable
CREATE TABLE "StateRegistration" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "headName" TEXT NOT NULL,
    "headAadharNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "registrarNumber" TEXT,
    "registrationCertificateUrl" TEXT,
    "headPassportPhotoUrl" TEXT,
    "headAadharFrontUrl" TEXT,
    "headAadharBackUrl" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistrictRegistration" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "headName" TEXT NOT NULL,
    "headAadharNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "registrarNumber" TEXT,
    "registrationCertificateUrl" TEXT,
    "headPassportPhotoUrl" TEXT,
    "headAadharFrontUrl" TEXT,
    "headAadharBackUrl" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NationalPaymentConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "razorpayKeyId" TEXT NOT NULL,
    "razorpayKeySecret" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StateRegistration_stateId_key" ON "StateRegistration"("stateId");

-- CreateIndex
CREATE INDEX "StateRegistration_status_idx" ON "StateRegistration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictRegistration_districtId_key" ON "DistrictRegistration"("districtId");

-- CreateIndex
CREATE INDEX "DistrictRegistration_status_idx" ON "DistrictRegistration"("status");

-- AddForeignKey
ALTER TABLE "StateRegistration" ADD CONSTRAINT "StateRegistration_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateRegistration" ADD CONSTRAINT "StateRegistration_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictRegistration" ADD CONSTRAINT "DistrictRegistration_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistrictRegistration" ADD CONSTRAINT "DistrictRegistration_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
