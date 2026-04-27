-- Many age categories per competition (replaces optional single ageCategoryId).

CREATE TABLE "CompetitionAgeCategory" (
    "competitionId" TEXT NOT NULL,
    "ageCategoryId" TEXT NOT NULL,

    CONSTRAINT "CompetitionAgeCategory_pkey" PRIMARY KEY ("competitionId","ageCategoryId")
);

ALTER TABLE "CompetitionAgeCategory" ADD CONSTRAINT "CompetitionAgeCategory_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionAgeCategory" ADD CONSTRAINT "CompetitionAgeCategory_ageCategoryId_fkey" FOREIGN KEY ("ageCategoryId") REFERENCES "AgeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CompetitionAgeCategory_ageCategoryId_idx" ON "CompetitionAgeCategory"("ageCategoryId");

INSERT INTO "CompetitionAgeCategory" ("competitionId", "ageCategoryId")
SELECT "id", "ageCategoryId" FROM "Competition" WHERE "ageCategoryId" IS NOT NULL;

ALTER TABLE "Competition" DROP CONSTRAINT IF EXISTS "Competition_ageCategoryId_fkey";
ALTER TABLE "Competition" DROP COLUMN IF EXISTS "ageCategoryId";
