import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { PaymentPurpose } from "@prisma/client";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";

function verifySignature(body: string, signature: string | undefined, secret: string) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function rawBodyString(body: unknown): string {
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { order_id?: string; id?: string } };
    order?: { entity?: { id?: string } };
  };
};

async function resolveWebhookSecret(purpose: PaymentPurpose, stateId: string) {
  if (purpose === PaymentPurpose.STATE_REGISTRATION) {
    const cfg = await nationalPaymentRepository.findSingleton();
    return cfg?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  }
  const cfg = await statePaymentRepository.findByStateId(stateId);
  return cfg?.webhookSecret || "";
}

/**
 * Single Razorpay webhook for all accounts (national + every state).
 *
 * Configure in each Razorpay Dashboard → Webhooks:
 *   URL: {BASE}/api/webhooks/razorpay
 *   Events: payment.captured, order.paid
 *   Secret: that account's webhookSecret in payment config
 *
 * We look up the payment by order_id, pick the matching account secret,
 * verify X-Razorpay-Signature, then mark paid (idempotent with /payments/verify).
 */
export async function razorpay(req: Request, res: Response, next: NextFunction) {
  try {
    const bodyString = rawBodyString(req.body);
    const payload = JSON.parse(bodyString) as RazorpayWebhookPayload;

    if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
      res.json({ ok: true });
      return;
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id ?? payload.payload?.order?.entity?.id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!orderId) {
      res.json({ ok: true });
      return;
    }

    const payment = await paymentRepository.findFirstByRazorpayOrderId(orderId);
    if (!payment) {
      // Unknown order — acknowledge so Razorpay does not retry forever.
      res.json({ ok: true });
      return;
    }

    const webhookSecret = await resolveWebhookSecret(payment.purpose, payment.stateId);
    const sig = req.get("x-razorpay-signature");
    if (!verifySignature(bodyString, sig, webhookSecret)) {
      res.status(400).send("Invalid signature");
      return;
    }

    await applySuccessfulPayment(payment.id, razorpayPaymentId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
