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

export const reconcileRazorpaySchema = z.object({
  stateId: z.string().optional(),
  purpose: z.nativeEnum(PaymentPurpose).optional(),
  /** Max PENDING rows to check against Razorpay (default 50, max 200). */
  limit: z.number().int().min(1).max(200).optional().default(50),
  /** If true, report what would be marked without writing. */
  dryRun: z.boolean().optional().default(false),
});
