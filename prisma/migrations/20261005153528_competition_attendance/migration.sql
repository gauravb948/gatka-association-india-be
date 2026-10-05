-- CreateTable
CREATE TABLE "CompetitionAttendance" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionAttendance_competitionId_idx" ON "CompetitionAttendance"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionAttendance_eventId_idx" ON "CompetitionAttendance"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAttendance_competitionId_eventId_userId_key" ON "CompetitionAttendance"("competitionId", "eventId", "userId");

-- AddForeignKey
ALTER TABLE "CompetitionAttendance" ADD CONSTRAINT "CompetitionAttendance_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAttendance" ADD CONSTRAINT "CompetitionAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAttendance" ADD CONSTRAINT "CompetitionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAttendance" ADD CONSTRAINT "CompetitionAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

