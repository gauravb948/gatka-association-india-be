-- CreateTable
CREATE TABLE "StateDomain" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StateDomain_stateId_key" ON "StateDomain"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "StateDomain_domainName_key" ON "StateDomain"("domainName");

-- CreateIndex
CREATE INDEX "StateDomain_stateId_idx" ON "StateDomain"("stateId");

-- AddForeignKey
ALTER TABLE "StateDomain" ADD CONSTRAINT "StateDomain_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one dummy domain per state (idempotent).
INSERT INTO "StateDomain" ("id", "stateId", "domainName", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  s."id",
  lower(s."code") || '.dummy.gatka.in',
  NOW(),
  NOW()
FROM "State" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StateDomain" d
  WHERE d."stateId" = s."id"
);
