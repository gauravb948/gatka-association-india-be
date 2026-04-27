ALTER TABLE "Competition" ADD COLUMN "ageCategoryId" TEXT;

ALTER TABLE "Competition" ADD CONSTRAINT "Competition_ageCategoryId_fkey" FOREIGN KEY ("ageCategoryId") REFERENCES "AgeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
