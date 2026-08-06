import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { PaymentPurpose, type Prisma } from "@prisma/client";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as razorpayWebhookRepository from "../repositories/razorpayWebhook.repository.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";
import { fetchCapturedPaymentForOrder, getRazorpayForState } from "../lib/razorpayClient.js";
import { getRazorpayConfigForPayment } from "../lib/razorpayConfig.js";

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
 * Every delivery is stored in RazorpayWebhookEvent. We look up the payment by
 * order_id, verify X-Razorpay-Signature, then mark paid (idempotent with
 * /payments/verify).
 *
 * If the signature check fails, we fall back to asking Razorpay's API directly
 * (via our own key/secret, not the webhook secret) whether the order's payment is
 * captured before rejecting — this stops a misconfigured webhookSecret from
 * stranding an already-captured payment. The mismatch is still recorded on the
 * RazorpayWebhookEvent row (`invalid_signature_recovered_via_api`) and logged so
 * the stored webhookSecret can be fixed.
 */
export async function razorpay(req: Request, res: Response, next: NextFunction) {
  let webhookEventId: string | undefined;
  try {
    const bodyString = rawBodyString(req.body);
    let payload: RazorpayWebhookPayload = {};
    try {
      payload = JSON.parse(bodyString) as RazorpayWebhookPayload;
    } catch {
      payload = {};
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id ?? payload.payload?.order?.entity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const sig = req.get("x-razorpay-signature") ?? undefined;
    const razorpayEventId = req.get("x-razorpay-event-id") ?? undefined;

    const payment = orderId
      ? await paymentRepository.findFirstByRazorpayOrderId(orderId)
      : null;

    const row = await razorpayWebhookRepository.create({
      event: payload.event ?? null,
      razorpayEventId: razorpayEventId ?? null,
      razorpayOrderId: orderId ?? null,
      razorpayPaymentId: razorpayPaymentId ?? null,
      signature: sig ?? null,
      paymentId: payment?.id ?? null,
      payload: (payload && Object.keys(payload).length > 0
        ? payload
        : { raw: bodyString }) as Prisma.InputJsonValue,
    });
    webhookEventId = row.id;

    if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
      await razorpayWebhookRepository.update(row.id, { processed: true });
      res.json({ ok: true });
      return;
    }

    if (!orderId || !payment) {
      await razorpayWebhookRepository.update(row.id, {
        processed: true,
        processError: !orderId ? "missing_order_id" : "payment_not_found",
      });
      res.json({ ok: true });
      return;
    }

    const webhookSecret = await resolveWebhookSecret(payment.purpose, payment.stateId);
    const signatureValid = verifySignature(bodyString, sig, webhookSecret);
    await razorpayWebhookRepository.update(row.id, { signatureValid });

    if (!signatureValid) {
      // The stored webhookSecret may be misconfigured even though the order/key
      // secret is correct. Before rejecting, independently re-confirm capture with
      // Razorpay's API (authenticated with our own key/secret) so a bad webhookSecret
      // doesn't strand an already-captured payment. Never trust the webhook body itself
      // for this decision — only Razorpay's authoritative response for this orderId.
      let recoveredViaApi = false;
      try {
        const cfg = await getRazorpayConfigForPayment(payment.purpose, payment.stateId);
        const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
        const captured = await fetchCapturedPaymentForOrder(rz, orderId);
        if (captured?.id) {
          await applySuccessfulPayment(payment.id, captured.id);
          recoveredViaApi = true;
        }
      } catch (fallbackErr) {
        console.error("Razorpay webhook invalid-signature API fallback check failed", fallbackErr);
      }

      if (recoveredViaApi) {
        console.error(
          `Razorpay webhook signature mismatch for state ${payment.stateId} (purpose ${payment.purpose}) — ` +
            `payment ${payment.id} recovered via API fallback. Check StatePaymentConfig.webhookSecret for this state.`
        );
        await razorpayWebhookRepository.update(row.id, {
          processed: true,
          processError: "invalid_signature_recovered_via_api",
        });
        res.json({ ok: true });
        return;
      }

      await razorpayWebhookRepository.update(row.id, {
        processError: "invalid_signature",
      });
      res.status(400).send("Invalid signature");
      return;
    }

    await applySuccessfulPayment(payment.id, razorpayPaymentId);
    await razorpayWebhookRepository.update(row.id, { processed: true });
    res.json({ ok: true });
  } catch (e) {
    if (webhookEventId) {
      try {
        await razorpayWebhookRepository.update(webhookEventId, {
          processError: e instanceof Error ? e.message : "processing_failed",
        });
      } catch {
        // ignore secondary persistence failure
      }
    }
    next(e);
  }
}
