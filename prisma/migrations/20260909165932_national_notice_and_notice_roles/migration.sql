/*
  Warnings:

  - You are about to drop the column `districtId` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `stateId` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `targetRole` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `trainingCenterId` on the `Notice` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Notice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notice" DROP CONSTRAINT "Notice_districtId_fkey";

-- DropForeignKey
ALTER TABLE "Notice" DROP CONSTRAINT "Notice_stateId_fkey";

-- DropForeignKey
ALTER TABLE "Notice" DROP CONSTRAINT "Notice_trainingCenterId_fkey";

-- DropIndex
DROP INDEX "Notice_districtId_idx";

-- DropIndex
DROP INDEX "Notice_stateId_idx";

-- AlterTable
ALTER TABLE "Notice" DROP COLUMN "districtId",
DROP COLUMN "stateId",
DROP COLUMN "targetRole",
DROP COLUMN "trainingCenterId",
ADD COLUMN     "targetRoles" "Role"[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "NationalNotice" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notice_authorId_idx" ON "Notice"("authorId");

-- CreateIndex
CREATE INDEX "Notice_createdAt_idx" ON "Notice"("createdAt");

-- AddForeignKey
ALTER TABLE "NationalNotice" ADD CONSTRAINT "NationalNotice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
