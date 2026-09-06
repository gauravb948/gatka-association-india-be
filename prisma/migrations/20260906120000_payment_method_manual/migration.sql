-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('RAZORPAY', 'MANUAL');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY';

-- CreateIndex
CREATE INDEX "Payment_method_status_idx" ON "Payment"("method", "status");
