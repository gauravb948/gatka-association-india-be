-- AlterTable
ALTER TABLE "RefereeProfile" ADD COLUMN "districtId" TEXT,
ADD COLUMN "fatherName" TEXT,
ADD COLUMN "aadharNumber" TEXT,
ADD COLUMN "alternatePhone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "appliedFor" TEXT,
ADD COLUMN "education" TEXT,
ADD COLUMN "experienceInGatka" "GatkaExperience",
ADD COLUMN "aadharFrontUrl" TEXT,
ADD COLUMN "aadharBackUrl" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefereeProfile_districtId_idx" ON "RefereeProfile"("districtId");

-- AddForeignKey
ALTER TABLE "RefereeProfile" ADD CONSTRAINT "RefereeProfile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
