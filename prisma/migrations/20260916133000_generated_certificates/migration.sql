-- CreateTable
CREATE TABLE "GeneratedCertificate" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerUserId" TEXT NOT NULL,
    "kind" "CertificateKind" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedCertificate_competitionId_eventId_playerUserId_kind_key" ON "GeneratedCertificate"("competitionId", "eventId", "playerUserId", "kind");

-- CreateIndex
CREATE INDEX "GeneratedCertificate_competitionId_eventId_kind_idx" ON "GeneratedCertificate"("competitionId", "eventId", "kind");

-- CreateIndex
CREATE INDEX "GeneratedCertificate_playerUserId_idx" ON "GeneratedCertificate"("playerUserId");

-- AddForeignKey
ALTER TABLE "GeneratedCertificate" ADD CONSTRAINT "GeneratedCertificate_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCertificate" ADD CONSTRAINT "GeneratedCertificate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCertificate" ADD CONSTRAINT "GeneratedCertificate_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedCertificate" ADD CONSTRAINT "GeneratedCertificate_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
