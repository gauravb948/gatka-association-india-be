-- Competition season is inferred from createdAt calendar year (no Session FK).
ALTER TABLE "Competition" DROP CONSTRAINT IF EXISTS "Competition_sessionId_fkey";
DROP INDEX IF EXISTS "Competition_sessionId_idx";
ALTER TABLE "Competition" DROP COLUMN IF EXISTS "sessionId";

-- Participation: optional session (legacy); per-event signup via CompetitionEvent.
ALTER TABLE "ParticipationRecord" ALTER COLUMN "sessionId" DROP NOT NULL;
ALTER TABLE "ParticipationRecord" ADD COLUMN "competitionEventId" TEXT;
ALTER TABLE "ParticipationRecord" ADD COLUMN "teamId" TEXT;

ALTER TABLE "ParticipationRecord" DROP CONSTRAINT IF EXISTS "ParticipationRecord_competitionEventId_fkey";
ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_competitionEventId_fkey"
  FOREIGN KEY ("competitionEventId") REFERENCES "CompetitionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "ParticipationRecord_competitionId_playerUserId_competitionEventId_key"
  ON "ParticipationRecord"("competitionId", "playerUserId", "competitionEventId");

CREATE INDEX IF NOT EXISTS "ParticipationRecord_competitionEventId_idx" ON "ParticipationRecord"("competitionEventId");
