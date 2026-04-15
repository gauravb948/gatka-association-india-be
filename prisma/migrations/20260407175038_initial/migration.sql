/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CoachAppliedFor" AS ENUM ('SENIOR_COACH', 'ASSISTANT_COACH');

-- CreateEnum
CREATE TYPE "GatkaExperience" AS ENUM ('LT_1_YEAR', 'Y1_3', 'Y3_5', 'Y5_10', 'GT_10');

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "aadharBackUrl" TEXT,
ADD COLUMN     "aadharFrontUrl" TEXT,
ADD COLUMN     "aadharNumber" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "appliedFor" "CoachAppliedFor",
ADD COLUMN     "experienceInGatka" "GatkaExperience",
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "District" ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "RefereeProfile" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "TrainingCenter" ADD COLUMN     "address" TEXT,
ADD COLUMN     "headAadharBackUrl" TEXT,
ADD COLUMN     "headAadharFrontUrl" TEXT,
ADD COLUMN     "headAadharNumber" TEXT,
ADD COLUMN     "headName" TEXT,
ADD COLUMN     "headPassportPhotoUrl" TEXT,
ADD COLUMN     "registrarNumber" TEXT,
ADD COLUMN     "registrationCertificateUrl" TEXT,
ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "EntityStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "VolunteerProfile" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage"("slug");

-- CreateIndex
CREATE INDEX "CmsPage_isPublished_idx" ON "CmsPage"("isPublished");

-- CreateIndex
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");

-- CreateIndex
CREATE INDEX "Banner_sortOrder_idx" ON "Banner"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
