-- Participation records reference catalog Event directly; `CompetitionEvent` join is removed
-- (every active catalog event is in play for every competition).

ALTER TABLE "ParticipationRecord" ADD COLUMN "eventId" TEXT;

UPDATE "ParticipationRecord" AS pr
SET "eventId" = ce."eventId"
FROM "CompetitionEvent" AS ce
WHERE pr."competitionEventId" = ce."id";

ALTER TABLE "ParticipationRecord" DROP CONSTRAINT IF EXISTS "ParticipationRecord_competitionEventId_fkey";
DROP INDEX IF EXISTS "ParticipationRecord_competitionEventId_idx";
DROP INDEX IF EXISTS "ParticipationRecord_competitionId_playerUserId_competitionEventId_key";
DROP INDEX IF EXISTS "ParticipationRecord_competitionId_playerUserId_competitionE_key";

ALTER TABLE "ParticipationRecord" DROP COLUMN "competitionEventId";

ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ParticipationRecord_competitionId_playerUserId_eventId_key"
  ON "ParticipationRecord"("competitionId", "playerUserId", "eventId");

CREATE INDEX "ParticipationRecord_eventId_idx" ON "ParticipationRecord"("eventId");

DROP TABLE "CompetitionEvent";
