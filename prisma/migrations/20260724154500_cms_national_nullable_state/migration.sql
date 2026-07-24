-- AlterTable: allow national CMS rows (stateId IS NULL)
ALTER TABLE "Banner" ALTER COLUMN "stateId" DROP NOT NULL;
ALTER TABLE "AboutUs" ALTER COLUMN "stateId" DROP NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "stateId" DROP NOT NULL;
ALTER TABLE "GalleryImage" ALTER COLUMN "stateId" DROP NOT NULL;

-- At most one national AboutUs row (Postgres UNIQUE allows multiple NULLs otherwise)
CREATE UNIQUE INDEX "AboutUs_national_unique" ON "AboutUs" ((1)) WHERE "stateId" IS NULL;
