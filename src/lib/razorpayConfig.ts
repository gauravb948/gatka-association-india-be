import { PaymentPurpose } from "@prisma/client";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import { AppError } from "./errors.js";

/**
 * Resolve the Razorpay account (key id/secret) used to create/verify orders for a
 * payment `purpose`. `STATE_REGISTRATION` and national competition entry fees use
 * the national account; everything else uses the target state's account.
 */
function competitionLevelFromMetadata(metadata?: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const level = (metadata as { competitionLevel?: unknown }).competitionLevel;
  return typeof level === "string" ? level : undefined;
}

/** National Razorpay account for state-association signup and national competition entry fees. */
export function usesNationalRazorpayAccount(purpose: PaymentPurpose, metadata?: unknown): boolean {
  if (purpose === PaymentPurpose.STATE_REGISTRATION) return true;
  if (purpose === PaymentPurpose.COMPETITION_ENTRY_FEE) {
    return competitionLevelFromMetadata(metadata) === "NATIONAL";
  }
  return false;
}

export async function getRazorpayConfigForPayment(
  purpose: PaymentPurpose,
  stateId: string,
  metadata?: unknown
) {
  if (usesNationalRazorpayAccount(purpose, metadata)) {
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
