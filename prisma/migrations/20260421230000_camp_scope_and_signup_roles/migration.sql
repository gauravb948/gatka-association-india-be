-- CreateTable
CREATE TABLE "CampState" (
    "campId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "CampState_pkey" PRIMARY KEY ("campId","stateId")
);

-- CreateTable
CREATE TABLE "CampDistrict" (
    "campId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "CampDistrict_pkey" PRIMARY KEY ("campId","districtId")
);

-- AlterTable
ALTER TABLE "Camp" ADD COLUMN "venue" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Camp" ALTER COLUMN "venue" DROP DEFAULT;
ALTER TABLE "Camp" ADD COLUMN "registrationOpensAt" TIMESTAMP(3);
ALTER TABLE "Camp" ADD COLUMN "registrationClosesAt" TIMESTAMP(3);
ALTER TABLE "Camp" ADD COLUMN "allowedSignupRoles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];
ALTER TABLE "Camp" ADD COLUMN "createdById" TEXT;

-- Backfill allowedSignupRoles from legacy audience
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['PLAYER']::"Role"[] WHERE "audience" = 'PLAYERS';
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['VOLUNTEER']::"Role"[] WHERE "audience" = 'VOLUNTEERS';
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['COACH']::"Role"[] WHERE "audience" = 'COACHES';
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['REFEREE']::"Role"[] WHERE "audience" = 'REFEREES';
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['PLAYER','COACH','REFEREE','VOLUNTEER','TRAINING_CENTER']::"Role"[] WHERE "audience" = 'ALL';
UPDATE "Camp" SET "allowedSignupRoles" = ARRAY['PLAYER','COACH','REFEREE','VOLUNTEER','TRAINING_CENTER']::"Role"[]
WHERE COALESCE(array_length("allowedSignupRoles", 1), 0) = 0;

ALTER TABLE "Camp" ALTER COLUMN "allowedSignupRoles" DROP DEFAULT;

-- Migrate geography into junction tables
INSERT INTO "CampState" ("campId", "stateId") SELECT "id", "stateId" FROM "Camp" WHERE "stateId" IS NOT NULL;
INSERT INTO "CampDistrict" ("campId", "districtId") SELECT "id", "districtId" FROM "Camp" WHERE "districtId" IS NOT NULL;

-- Drop old geography FKs on Camp
ALTER TABLE "Camp" DROP CONSTRAINT IF EXISTS "Camp_stateId_fkey";
ALTER TABLE "Camp" DROP CONSTRAINT IF EXISTS "Camp_districtId_fkey";
ALTER TABLE "Camp" DROP COLUMN "stateId";
ALTER TABLE "Camp" DROP COLUMN "districtId";

-- Legacy audience optional
ALTER TABLE "Camp" ALTER COLUMN "audience" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CampState" ADD CONSTRAINT "CampState_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampState" ADD CONSTRAINT "CampState_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampDistrict" ADD CONSTRAINT "CampDistrict_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampDistrict" ADD CONSTRAINT "CampDistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CampState_stateId_idx" ON "CampState"("stateId");
CREATE INDEX "CampDistrict_districtId_idx" ON "CampDistrict"("districtId");
CREATE INDEX "Camp_createdById_idx" ON "Camp"("createdById");
