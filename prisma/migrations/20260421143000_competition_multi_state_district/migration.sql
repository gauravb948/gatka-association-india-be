-- Many-to-many geographic scope for competitions (replaces single stateId / districtId).

CREATE TABLE "CompetitionState" (
    "competitionId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "CompetitionState_pkey" PRIMARY KEY ("competitionId","stateId")
);

CREATE TABLE "CompetitionDistrict" (
    "competitionId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,

    CONSTRAINT "CompetitionDistrict_pkey" PRIMARY KEY ("competitionId","districtId")
);

ALTER TABLE "CompetitionState" ADD CONSTRAINT "CompetitionState_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionState" ADD CONSTRAINT "CompetitionState_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitionDistrict" ADD CONSTRAINT "CompetitionDistrict_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionDistrict" ADD CONSTRAINT "CompetitionDistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CompetitionState_stateId_idx" ON "CompetitionState"("stateId");
CREATE INDEX "CompetitionDistrict_districtId_idx" ON "CompetitionDistrict"("districtId");

INSERT INTO "CompetitionState" ("competitionId", "stateId")
SELECT "id", "stateId" FROM "Competition" WHERE "stateId" IS NOT NULL;

INSERT INTO "CompetitionDistrict" ("competitionId", "districtId")
SELECT "id", "districtId" FROM "Competition" WHERE "districtId" IS NOT NULL;

ALTER TABLE "Competition" DROP CONSTRAINT "Competition_stateId_fkey";
ALTER TABLE "Competition" DROP CONSTRAINT "Competition_districtId_fkey";

ALTER TABLE "Competition" DROP COLUMN "stateId";
ALTER TABLE "Competition" DROP COLUMN "districtId";
