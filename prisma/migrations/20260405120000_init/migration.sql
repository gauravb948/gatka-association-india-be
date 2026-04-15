-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NATIONAL_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'TRAINING_CENTER', 'COACH', 'REFEREE', 'PLAYER', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'BOYS', 'GIRLS');

-- CreateEnum
CREATE TYPE "AgeBandType" AS ENUM ('SUB_JUNIOR', 'JUNIOR', 'SENIOR', 'VETERAN', 'OPEN');

-- CreateEnum
CREATE TYPE "CompetitionLevel" AS ENUM ('DISTRICT', 'STATE', 'NATIONAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('PLAYER_REGISTRATION', 'PLAYER_RENEWAL', 'TOURNAMENT_REGISTRATION', 'CAMP_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CampLevel" AS ENUM ('NATIONAL', 'STATE', 'DISTRICT');

-- CreateEnum
CREATE TYPE "CampAudience" AS ENUM ('PLAYERS', 'VOLUNTEERS', 'COACHES', 'REFEREES', 'ALL');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('DRAFT', 'PENDING_ORIGIN', 'PENDING_DESTINATION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SmsTemplateKey" AS ENUM ('REGISTRATION', 'RENEWAL', 'MEMBERSHIP_EXPIRY', 'PAYMENT_SUCCESS', 'OTP');

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "ageCalculationDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCenter" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "isSuperNational" BOOLEAN NOT NULL DEFAULT false,
    "stateId" TEXT,
    "districtId" TEXT,
    "trainingCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "userId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "trainingCenterId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "registrationNumber" TEXT,
    "membershipValidFrom" TIMESTAMP(3),
    "membershipValidUntil" TIMESTAMP(3),
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "documentsVerifiedAt" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistRemarks" TEXT,
    "tcDisabled" BOOLEAN NOT NULL DEFAULT false,
    "tcDisabledRemarks" TEXT,
    "dateOfJoining" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "userId" TEXT NOT NULL,
    "trainingCenterId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "membershipValidUntil" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RefereeProfile" (
    "userId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "membershipValidUntil" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefereeProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "VolunteerProfile" (
    "userId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "membershipValidUntil" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageFrom" INTEGER,
    "ageTo" INTEGER,
    "bandType" "AgeBandType",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageCategoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatePaymentConfig" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "razorpayKeyId" TEXT NOT NULL,
    "razorpayKeySecret" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatePaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "level" "CompetitionLevel" NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageCategoryId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "finalSubmitRequiresPayment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEvent" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "maxPlayers" INTEGER,
    "minPlayers" INTEGER,

    CONSTRAINT "CompetitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "playerUserId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT,
    "finalSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerUserId" TEXT NOT NULL,
    "level" "CompetitionLevel" NOT NULL,
    "competitionId" TEXT NOT NULL,
    "participated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "level" "CampLevel" NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "audience" "CampAudience" NOT NULL,
    "feeAmountPaise" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampRegistration" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "competitionId" TEXT,
    "campId" TEXT,
    "trainingCenterId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionResult" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerUserId" TEXT NOT NULL,
    "rank" INTEGER,
    "score" TEXT,
    "certificateQrPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "stateId" TEXT,
    "districtId" TEXT,
    "trainingCenterId" TEXT,
    "targetRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phoneOrEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStateId" TEXT NOT NULL,
    "fromDistrictId" TEXT,
    "fromTcId" TEXT,
    "toStateId" TEXT NOT NULL,
    "toDistrictId" TEXT,
    "toTcId" TEXT,
    "status" "MigrationStatus" NOT NULL DEFAULT 'PENDING_ORIGIN',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" TEXT NOT NULL,
    "key" "SmsTemplateKey" NOT NULL,
    "template" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "District_stateId_idx" ON "District"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "District_stateId_name_key" ON "District"("stateId", "name");

-- CreateIndex
CREATE INDEX "TrainingCenter_districtId_idx" ON "TrainingCenter"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_stateId_idx" ON "User"("stateId");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- CreateIndex
CREATE INDEX "User_trainingCenterId_idx" ON "User"("trainingCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_registrationNumber_key" ON "PlayerProfile"("registrationNumber");

-- CreateIndex
CREATE INDEX "PlayerProfile_stateId_idx" ON "PlayerProfile"("stateId");

-- CreateIndex
CREATE INDEX "PlayerProfile_districtId_idx" ON "PlayerProfile"("districtId");

-- CreateIndex
CREATE INDEX "PlayerProfile_trainingCenterId_idx" ON "PlayerProfile"("trainingCenterId");

-- CreateIndex
CREATE INDEX "EventGroup_ageCategoryId_idx" ON "EventGroup"("ageCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGroup_segment_gender_ageCategoryId_key" ON "EventGroup"("segment", "gender", "ageCategoryId");

-- CreateIndex
CREATE INDEX "Event_eventGroupId_idx" ON "Event"("eventGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "StatePaymentConfig_stateId_key" ON "StatePaymentConfig"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_stateId_idx" ON "Payment"("stateId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Competition_sessionId_idx" ON "Competition"("sessionId");

-- CreateIndex
CREATE INDEX "Competition_level_idx" ON "Competition"("level");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEvent_competitionId_eventId_key" ON "CompetitionEvent"("competitionId", "eventId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_competitionId_idx" ON "TournamentRegistration"("competitionId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_playerUserId_idx" ON "TournamentRegistration"("playerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_competitionId_playerUserId_eventId_key" ON "TournamentRegistration"("competitionId", "playerUserId", "eventId");

-- CreateIndex
CREATE INDEX "ParticipationRecord_sessionId_playerUserId_level_idx" ON "ParticipationRecord"("sessionId", "playerUserId", "level");

-- CreateIndex
CREATE INDEX "Camp_level_idx" ON "Camp"("level");

-- CreateIndex
CREATE UNIQUE INDEX "CampRegistration_campId_userId_key" ON "CampRegistration"("campId", "userId");

-- CreateIndex
CREATE INDEX "Attendance_userId_date_idx" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "Attendance_competitionId_idx" ON "Attendance"("competitionId");

-- CreateIndex
CREATE INDEX "Attendance_campId_idx" ON "Attendance"("campId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionResult_competitionId_eventId_playerUserId_key" ON "CompetitionResult"("competitionId", "eventId", "playerUserId");

-- CreateIndex
CREATE INDEX "Notice_stateId_idx" ON "Notice"("stateId");

-- CreateIndex
CREATE INDEX "Notice_districtId_idx" ON "Notice"("districtId");

-- CreateIndex
CREATE INDEX "OtpCode_phoneOrEmail_idx" ON "OtpCode"("phoneOrEmail");

-- CreateIndex
CREATE INDEX "MigrationRequest_userId_idx" ON "MigrationRequest"("userId");

-- CreateIndex
CREATE INDEX "Complaint_userId_idx" ON "Complaint"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_key_key" ON "SmsTemplate"("key");

-- CreateIndex
CREATE INDEX "SmsOutbox_status_idx" ON "SmsOutbox"("status");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCenter" ADD CONSTRAINT "TrainingCenter_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_trainingCenterId_fkey" FOREIGN KEY ("trainingCenterId") REFERENCES "TrainingCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_trainingCenterId_fkey" FOREIGN KEY ("trainingCenterId") REFERENCES "TrainingCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_trainingCenterId_fkey" FOREIGN KEY ("trainingCenterId") REFERENCES "TrainingCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeProfile" ADD CONSTRAINT "RefereeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeProfile" ADD CONSTRAINT "RefereeProfile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerProfile" ADD CONSTRAINT "VolunteerProfile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_ageCategoryId_fkey" FOREIGN KEY ("ageCategoryId") REFERENCES "AgeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatePaymentConfig" ADD CONSTRAINT "StatePaymentConfig_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_ageCategoryId_fkey" FOREIGN KEY ("ageCategoryId") REFERENCES "AgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEvent" ADD CONSTRAINT "CompetitionEvent_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEvent" ADD CONSTRAINT "CompetitionEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampRegistration" ADD CONSTRAINT "CampRegistration_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampRegistration" ADD CONSTRAINT "CampRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampRegistration" ADD CONSTRAINT "CampRegistration_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_trainingCenterId_fkey" FOREIGN KEY ("trainingCenterId") REFERENCES "TrainingCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRequest" ADD CONSTRAINT "MigrationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRequest" ADD CONSTRAINT "MigrationRequest_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRequest" ADD CONSTRAINT "MigrationRequest_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsOutbox" ADD CONSTRAINT "SmsOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

