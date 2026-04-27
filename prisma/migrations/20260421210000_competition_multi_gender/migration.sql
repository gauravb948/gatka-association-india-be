-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "genders" "Gender"[] NOT NULL DEFAULT ARRAY[]::"Gender"[];

UPDATE "Competition" SET "genders" = ARRAY["gender"]::"Gender"[];

ALTER TABLE "Competition" DROP COLUMN "gender";

ALTER TABLE "Competition" ALTER COLUMN "genders" DROP DEFAULT;
