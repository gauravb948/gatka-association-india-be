-- One attendance row per subject user per calendar day (re-posts update the same row).

-- Drop non-unique index; replaced by unique constraint below.
DROP INDEX IF EXISTS "Attendance_userId_date_idx";

-- If duplicates exist, keep the newest row per (userId, date) by createdAt.
DELETE FROM "Attendance" a
WHERE a."id" IN (
  SELECT s."id"
  FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "userId", "date" ORDER BY "createdAt" DESC) AS rn
    FROM "Attendance"
  ) s
  WHERE s.rn > 1
);

CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");
