-- CreateEnum
CREATE TYPE "VolunteerRegistrationStatus" AS ENUM ('REGISTERED');

-- CreateTable
CREATE TABLE "VolunteerRegistration" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "motherName" TEXT NOT NULL,
    "aadharNumber" TEXT NOT NULL,
    "maritalStatus" "MaritalStatus" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "address" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "tShirtSize" "TShirtSize" NOT NULL,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityDetails" TEXT,
    "photoUrl" TEXT NOT NULL,
    "aadharFrontUrl" TEXT NOT NULL,
    "aadharBackUrl" TEXT NOT NULL,
    "status" "VolunteerRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerRegistration_email_key" ON "VolunteerRegistration"("email");

-- CreateIndex
CREATE INDEX "VolunteerRegistration_stateId_idx" ON "VolunteerRegistration"("stateId");

-- CreateIndex
CREATE INDEX "VolunteerRegistration_districtId_idx" ON "VolunteerRegistration"("districtId");

-- CreateIndex
CREATE INDEX "VolunteerRegistration_status_idx" ON "VolunteerRegistration"("status");

-- CreateIndex
CREATE INDEX "VolunteerRegistration_createdAt_idx" ON "VolunteerRegistration"("createdAt");

-- CreateIndex
CREATE INDEX "VolunteerRegistration_phone_idx" ON "VolunteerRegistration"("phone");

-- AddForeignKey
ALTER TABLE "VolunteerRegistration" ADD CONSTRAINT "VolunteerRegistration_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRegistration" ADD CONSTRAINT "VolunteerRegistration_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
