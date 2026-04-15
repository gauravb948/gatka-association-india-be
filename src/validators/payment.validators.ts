import { z } from "zod";
import { PaymentPurpose } from "@prisma/client";

export const createRazorpayOrderSchema = z.object({
  stateId: z.string(),
  purpose: z.nativeEnum(PaymentPurpose),
  amountPaise: z.number().int().positive(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
