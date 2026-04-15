-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentPurpose" ADD VALUE 'COACH_REGISTRATION';
ALTER TYPE "PaymentPurpose" ADD VALUE 'COACH_RENEWAL';
ALTER TYPE "PaymentPurpose" ADD VALUE 'REFEREE_REGISTRATION';
ALTER TYPE "PaymentPurpose" ADD VALUE 'REFEREE_RENEWAL';
ALTER TYPE "PaymentPurpose" ADD VALUE 'VOLUNTEER_REGISTRATION';
ALTER TYPE "PaymentPurpose" ADD VALUE 'VOLUNTEER_RENEWAL';
ALTER TYPE "PaymentPurpose" ADD VALUE 'TRAINING_CENTER_REGISTRATION';
ALTER TYPE "PaymentPurpose" ADD VALUE 'TRAINING_CENTER_RENEWAL';
