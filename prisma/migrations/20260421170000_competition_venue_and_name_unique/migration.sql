-- Competition form: venue; age bands for signup come from events + ageTillDate (drop minimumAgeYears).

ALTER TABLE "Competition" ADD COLUMN "venue" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Competition" ALTER COLUMN "venue" DROP DEFAULT;

ALTER TABLE "Competition" DROP COLUMN IF EXISTS "minimumAgeYears";
