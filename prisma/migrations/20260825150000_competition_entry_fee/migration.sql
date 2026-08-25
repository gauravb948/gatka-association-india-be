-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'COMPETITION_ENTRY_FEE';

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "entryFeePaise" INTEGER;

-- CreateEnum
CREATE TYPE "CompetitionFeeUnitType" AS ENUM ('DISTRICT', 'STATE');

-- CreateTable
CREATE TABLE "CompetitionFeeSubmission" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "unitType" "CompetitionFeeUnitType" NOT NULL,
    "unitId" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "paymentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionFeeSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionFeeSubmission_paymentId_key" ON "CompetitionFeeSubmission"("paymentId");
CREATE UNIQUE INDEX "CompetitionFeeSubmission_competitionId_unitType_unitId_key" ON "CompetitionFeeSubmission"("competitionId", "unitType", "unitId");
CREATE INDEX "CompetitionFeeSubmission_competitionId_idx" ON "CompetitionFeeSubmission"("competitionId");

ALTER TABLE "CompetitionFeeSubmission" ADD CONSTRAINT "CompetitionFeeSubmission_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionFeeSubmission" ADD CONSTRAINT "CompetitionFeeSubmission_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
