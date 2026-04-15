import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";

function verifySignature(body: string, signature: string | undefined, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function razorpay(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stateId = req.params.stateId;
    const cfg = await statePaymentRepository.findByStateId(stateId);
    if (!cfg) {
      res.status(400).send("Unknown state");
      return;
    }
    const raw = req.body as Buffer | string;
    const bodyString = Buffer.isBuffer(raw)
      ? raw.toString("utf8")
      : typeof raw === "string"
        ? raw
        : JSON.stringify(raw);
    const sig = req.get("x-razorpay-signature");
    if (!verifySignature(bodyString, sig, cfg.webhookSecret)) {
      res.status(400).send("Invalid signature");
      return;
    }
    const payload = JSON.parse(bodyString) as {
      event?: string;
      payload?: {
        payment?: { entity?: { order_id?: string; id?: string } };
      };
    };
    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      const orderId = payload.payload?.payment?.entity?.order_id;
      const payId = payload.payload?.payment?.entity?.id;
      if (orderId) {
        const payment = await paymentRepository.findFirstByRazorpayOrderId(orderId);
        if (payment) {
          await applySuccessfulPayment(payment.id, payId);
        }
      }
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
