-- Gallery: category grouping + sort
ALTER TABLE "GalleryImage" ADD COLUMN "category" TEXT;
ALTER TABLE "GalleryImage" ADD COLUMN "categoryPa" TEXT;
ALTER TABLE "GalleryImage" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "GalleryImage_sortOrder_idx" ON "GalleryImage"("sortOrder");

-- PagesContent: allow national rows (stateId IS NULL)
ALTER TABLE "PagesContent" ALTER COLUMN "stateId" DROP NOT NULL;
CREATE INDEX "PagesContent_page_idx" ON "PagesContent"("page");
CREATE UNIQUE INDEX "PagesContent_national_page_unique" ON "PagesContent"("page") WHERE "stateId" IS NULL;

-- Weapons (national catalog)
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namePa" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Weapon_isActive_idx" ON "Weapon"("isActive");
CREATE INDEX "Weapon_sortOrder_idx" ON "Weapon"("sortOrder");

-- Association members (state-scoped)
CREATE TABLE "AssociationMember" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "mobile" TEXT,
    "photoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssociationMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssociationMember_stateId_idx" ON "AssociationMember"("stateId");
CREATE INDEX "AssociationMember_sortOrder_idx" ON "AssociationMember"("sortOrder");
ALTER TABLE "AssociationMember" ADD CONSTRAINT "AssociationMember_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
