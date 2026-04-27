-- Replace competition age category with age-as-of-date + minimum age (years).

ALTER TABLE "Competition" ADD COLUMN "ageTillDate" TIMESTAMP(3),
ADD COLUMN "minimumAgeYears" INTEGER;

ALTER TABLE "Competition" DROP CONSTRAINT "Competition_ageCategoryId_fkey";
ALTER TABLE "Competition" DROP COLUMN "ageCategoryId";
