-- Add EXPIRED to EntityStatus
ALTER TYPE "EntityStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- Add membership renewal purposes
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'STATE_MEMBERSHIP_RENEWAL';
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'DISTRICT_MEMBERSHIP_RENEWAL';

-- MembershipStatus enum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- Membership table
CREATE TABLE "Membership" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "type"       "Role" NOT NULL,
    "validFrom"  TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status"     "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentId"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Membership_userId_idx"     ON "Membership"("userId");
CREATE INDEX "Membership_status_idx"     ON "Membership"("status");
CREATE INDEX "Membership_validUntil_idx" ON "Membership"("validUntil");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
