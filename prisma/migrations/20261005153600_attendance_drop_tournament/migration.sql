-- Legacy TOURNAMENT attendance rows have been backfilled into CompetitionAttendance
-- by prisma/migrateCompetitionAttendance.ts. Run that script against this database
-- BEFORE applying this migration, and confirm its summary output looks right —
-- this migration deletes the legacy rows and drops the column they relied on.
DELETE FROM "Attendance" WHERE "type" = 'TOURNAMENT';

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_competitionId_fkey";

-- DropIndex
DROP INDEX "Attendance_competitionId_idx";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "competitionId";
