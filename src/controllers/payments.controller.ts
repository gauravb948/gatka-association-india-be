import crypto from "crypto";
import { PaymentPurpose, PaymentStatus, type Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import { AppError } from "../lib/errors.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";
import { createRazorpayOrderSchema, verifyPaymentSchema } from "../validators/payment.validators.js";

async function getRazorpayConfigForPayment(purpose: PaymentPurpose, stateId: string) {
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

export async function createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createRazorpayOrderSchema.parse(req.body);
    const u = req.dbUser!;
    const cfg = await getRazorpayConfigForPayment(body.purpose, body.stateId);

    const payData: Prisma.PaymentCreateInput = {
      user: { connect: { id: u.id } },
      state: { connect: { id: body.stateId } },
      purpose: body.purpose,
      amountPaise: body.amountPaise,
      status: PaymentStatus.PENDING,
    };
    if (body.sessionId) payData.session = { connect: { id: body.sessionId } };
    if (body.metadata != null) {
      payData.metadata = body.metadata as Prisma.InputJsonValue;
    }
    const payment = await paymentRepository.createPayment(payData);

    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const order = await rz.orders.create({
      amount: body.amountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: {
        paymentId: payment.id,
        userId: u.id,
        purpose: body.purpose,
      },
    });

    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);

    res.status(201).json({
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amountPaise: body.amountPaise,
      currency: "INR",
      keyId: cfg.razorpayKeyId,
    });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await paymentRepository.findManyByUser(req.dbUser!.id, 50);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/**
 * Client-side payment verification.
 *
 * After the Razorpay checkout modal returns, the client posts
 * `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
 *
 * We verify the HMAC-SHA256 signature using the state's `key_secret`,
 * then mark the payment as paid and run all business-side transitions
 * (user status, registration status, membership dates, etc.).
 */
export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      verifyPaymentSchema.parse(req.body);

    const payment = await paymentRepository.findFirstByRazorpayOrderId(razorpay_order_id);
    if (!payment) {
      throw new AppError(404, "No payment found for this Razorpay order", "PAYMENT_NOT_FOUND");
    }

    if (payment.status === PaymentStatus.PAID) {
      return res.json({ verified: true, payment });
    }

    const cfg = await getRazorpayConfigForPayment(payment.purpose, payment.stateId);

    const expectedSig = crypto
      .createHmac("sha256", cfg.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigValid =
      expectedSig.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(razorpay_signature));

    if (!sigValid) {
      throw new AppError(400, "Invalid Razorpay signature", "INVALID_SIGNATURE");
    }

    await applySuccessfulPayment(payment.id, razorpay_payment_id);

    const refreshed = await paymentRepository.findById(payment.id);
    res.json({ verified: true, payment: refreshed ?? payment });
  } catch (e) {
    next(e);
  }
}
