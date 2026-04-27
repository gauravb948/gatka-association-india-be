-- Add player-count columns to Event (predefined per event, independent of competition).
ALTER TABLE "Event" ADD COLUMN "minPlayers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN "maxPlayers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN "optionalPlayers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Event" ADD COLUMN "totalPlayers" INTEGER NOT NULL DEFAULT 0;

-- Seed 6 predefined events for every existing EventGroup.
-- Idempotent: skips any (eventGroupId, name) pair that already exists.
INSERT INTO "Event" (
  "id", "eventGroupId", "name",
  "minPlayers", "maxPlayers", "optionalPlayers", "totalPlayers",
  "sortOrder", "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  eg."id",
  e."name",
  e."minPlayers",
  e."maxPlayers",
  e."optionalPlayers",
  e."totalPlayers",
  e."sortOrder",
  true,
  NOW(),
  NOW()
FROM "EventGroup" eg
CROSS JOIN (
  VALUES
    ('Team Demo',              8, 10, 1, 11, 1),
    ('Individual Demo',        1,  1, 0,  1, 2),
    ('Team Fari Soti',         3,  3, 1,  4, 3),
    ('Individual Fari Soti',   1,  1, 0,  1, 4),
    ('Team Single Soti',       3,  3, 1,  4, 5),
    ('Individual Single Soti', 1,  1, 0,  1, 6)
) AS e("name", "minPlayers", "maxPlayers", "optionalPlayers", "totalPlayers", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1
  FROM "Event" ex
  WHERE ex."eventGroupId" = eg."id"
    AND ex."name" = e."name"
);
