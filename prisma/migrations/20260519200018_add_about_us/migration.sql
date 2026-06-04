-- CreateTable
CREATE TABLE "AboutUs" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "stateTitle" TEXT NOT NULL,
    "stateTitleNative" TEXT,
    "phoneNo" TEXT,
    "email" TEXT,
    "fbUrl" TEXT,
    "ytUrl" TEXT,
    "instaUrl" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutUs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AboutUs_stateId_key" ON "AboutUs"("stateId");

-- CreateIndex
CREATE INDEX "AboutUs_stateId_idx" ON "AboutUs"("stateId");

-- AddForeignKey
ALTER TABLE "AboutUs" ADD CONSTRAINT "AboutUs_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
