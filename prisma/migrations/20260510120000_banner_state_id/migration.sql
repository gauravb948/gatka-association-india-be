-- State-scoped banners: each banner belongs to one state.
-- Existing Banner rows get the lexicographically first state code (migration-time backfill).

ALTER TABLE "Banner" ADD COLUMN "stateId" TEXT;

UPDATE "Banner"
SET "stateId" = (SELECT "id" FROM "State" ORDER BY "code" ASC LIMIT 1)
WHERE "stateId" IS NULL;

ALTER TABLE "Banner" ALTER COLUMN "stateId" SET NOT NULL;

ALTER TABLE "Banner" ADD CONSTRAINT "Banner_stateId_fkey"
  FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Banner_stateId_idx" ON "Banner"("stateId");
