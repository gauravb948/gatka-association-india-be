-- Per-event aggregate results: standings are scoped to competition + catalog event.
DELETE FROM "CompetitionAggregateStanding";

ALTER TABLE "CompetitionAggregateStanding" ADD COLUMN "eventId" TEXT NOT NULL;

ALTER TABLE "CompetitionAggregateStanding"
  ADD CONSTRAINT "CompetitionAggregateStanding_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CompetitionAggregateStanding_competitionId_eventId_idx"
  ON "CompetitionAggregateStanding"("competitionId", "eventId");

CREATE INDEX "CompetitionAggregateStanding_eventId_idx"
  ON "CompetitionAggregateStanding"("eventId");
