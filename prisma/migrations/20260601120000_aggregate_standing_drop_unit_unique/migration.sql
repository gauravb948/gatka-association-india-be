-- Allow the same unit to appear in multiple rank bands (or more than once) for aggregate results.
DROP INDEX IF EXISTS "CompetitionAggregateStanding_competitionId_unitType_unitId_key";
