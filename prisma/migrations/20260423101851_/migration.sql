-- DropForeignKey
ALTER TABLE "ParticipationRecord" DROP CONSTRAINT "ParticipationRecord_sessionId_fkey";

-- AddForeignKey
ALTER TABLE "ParticipationRecord" ADD CONSTRAINT "ParticipationRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ParticipationRecord_competitionId_playerUserId_competitionEvent" RENAME TO "ParticipationRecord_competitionId_playerUserId_competitionE_key";
