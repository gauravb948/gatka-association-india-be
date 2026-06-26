-- AlterTable
ALTER TABLE "VolunteerProfile" ADD COLUMN "districtId" TEXT,
ADD COLUMN "fatherName" TEXT,
ADD COLUMN "motherName" TEXT,
ADD COLUMN "aadharNumber" TEXT,
ADD COLUMN "maritalStatus" "MaritalStatus",
ADD COLUMN "alternatePhone" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "tShirtSize" "TShirtSize",
ADD COLUMN "hasDisability" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disabilityDetails" TEXT,
ADD COLUMN "aadharFrontUrl" TEXT,
ADD COLUMN "aadharBackUrl" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VolunteerProfile_districtId_idx" ON "VolunteerProfile"("districtId");

-- AddForeignKey
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
