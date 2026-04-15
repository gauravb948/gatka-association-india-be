-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "designation" TEXT,
    "stateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_stateId_idx" ON "Message"("stateId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
