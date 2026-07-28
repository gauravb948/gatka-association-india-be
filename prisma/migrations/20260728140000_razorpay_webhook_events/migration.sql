-- CreateTable
CREATE TABLE "RazorpayWebhookEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT,
    "razorpayEventId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "signature" TEXT,
    "signatureValid" BOOLEAN,
    "paymentId" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processError" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RazorpayWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_event_idx" ON "RazorpayWebhookEvent"("event");

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_razorpayEventId_idx" ON "RazorpayWebhookEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_razorpayOrderId_idx" ON "RazorpayWebhookEvent"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_paymentId_idx" ON "RazorpayWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "RazorpayWebhookEvent_createdAt_idx" ON "RazorpayWebhookEvent"("createdAt");
