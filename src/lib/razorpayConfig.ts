import { PaymentPurpose } from "@prisma/client";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import { AppError } from "./errors.js";

/**
 * Resolve the Razorpay account (key id/secret) used to create/verify orders for a
 * payment `purpose`. `STATE_REGISTRATION` uses the national account; everything
 * else uses the target state's account. Shared by order creation, client-side
 * verify, admin reconcile, and the webhook's invalid-signature API fallback.
 */
export async function getRazorpayConfigForPayment(purpose: PaymentPurpose, stateId: string) {
  if (purpose === PaymentPurpose.STATE_REGISTRATION) {
    const cfg = await nationalPaymentRepository.findSingleton();
    if (cfg) return cfg;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      return { razorpayKeyId: keyId, razorpayKeySecret: keySecret, webhookSecret: "" };
    }
    throw new AppError(400, "National Razorpay config not set", "RZ_NOT_CONFIGURED");
  }

  const cfg = await statePaymentRepository.findByStateId(stateId);
  if (!cfg) throw new AppError(400, "Razorpay not configured for state", "RZ_NOT_CONFIGURED");
  return cfg;
}
