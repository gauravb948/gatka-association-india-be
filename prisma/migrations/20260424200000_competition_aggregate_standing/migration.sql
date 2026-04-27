-- Organization-level 1st/2nd/3rd standings (TC / district / state) per competition.

CREATE TABLE "CompetitionAggregateStanding" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "rankBand" INTEGER NOT NULL,
    "unitType" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tieOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "CompetitionAggregateStanding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionAggregateStanding_competitionId_unitType_unitId_key"
  ON "CompetitionAggregateStanding"("competitionId", "unitType", "unitId");

CREATE INDEX "CompetitionAggregateStanding_competitionId_rankBand_idx"
  ON "CompetitionAggregateStanding"("competitionId", "rankBand");

ALTER TABLE "CompetitionAggregateStanding" ADD CONSTRAINT "CompetitionAggregateStanding_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitionAggregateStanding" ADD CONSTRAINT "CompetitionAggregateStanding_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
