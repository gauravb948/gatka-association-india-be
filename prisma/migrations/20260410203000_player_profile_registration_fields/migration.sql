-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER');

-- CreateEnum
CREATE TYPE "TShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL');

-- CreateEnum
CREATE TYPE "PlayingHand" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN "fatherName" TEXT,
ADD COLUMN "motherName" TEXT,
ADD COLUMN "aadharNumber" TEXT,
ADD COLUMN "maritalStatus" "MaritalStatus",
ADD COLUMN "whatsappNo" TEXT,
ADD COLUMN "tShirtSize" "TShirtSize",
ADD COLUMN "playingHand" "PlayingHand",
ADD COLUMN "aadharFrontUrl" TEXT,
ADD COLUMN "aadharBackUrl" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
