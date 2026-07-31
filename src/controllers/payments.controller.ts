import crypto from "crypto";
import { PaymentPurpose, PaymentStatus, type Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";
import { createRazorpayOrderSchema, verifyPaymentSchema, reconcileRazorpaySchema } from "../validators/payment.validators.js";

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

    const meta: Record<string, unknown> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};

    // Server-side link so verify/webhook can mark the registration SUBMITTED
    // even if the client omits metadata.
    if (body.purpose === PaymentPurpose.DISTRICT_REGISTRATION && !meta.districtRegistrationId) {
      const reg = await prisma.districtRegistration.findUnique({
        where: { userId: u.id },
        select: { id: true },
      });
      if (reg) meta.districtRegistrationId = reg.id;
    }
    if (body.purpose === PaymentPurpose.STATE_REGISTRATION && !meta.stateRegistrationId) {
      const reg = await prisma.stateRegistration.findUnique({
        where: { userId: u.id },
        select: { id: true },
      });
      if (reg) meta.stateRegistrationId = reg.id;
    }

    if (Object.keys(meta).length > 0) {
      payData.metadata = meta as Prisma.InputJsonValue;
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
 * We verify the HMAC-SHA256 signature using the account `key_secret`,
 * then mark the payment as paid and run all business-side transitions
 * (user status, registration status, membership dates, etc.).
 *
 * If the browser closes before this call, the Razorpay webhook still confirms
 * the payment via `POST /api/webhooks/razorpay`.
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
      // Still run apply so PENDING org registrations get repaired if needed.
      await applySuccessfulPayment(payment.id, razorpay_payment_id);
      const refreshed = await paymentRepository.findById(payment.id);
      return res.json({ verified: true, payment: refreshed ?? payment });
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

type RazorpayOrderPayments = {
  items?: Array<{ id?: string; status?: string; amount?: number }>;
};

/**
 * National-admin reconcile: for PENDING local payments, fetch the Razorpay order's
 * payments. If any are captured (or order paid), mark local payment PAID and run
 * applySuccessfulPayment (user/registration SUBMITTED, etc.).
 */
export async function reconcileRazorpay(req: Request, res: Response, next: NextFunction) {
  try {
    const body = reconcileRazorpaySchema.parse(req.body ?? {});
    const pending = await paymentRepository.findPendingWithRazorpayOrder({
      take: body.limit,
      stateId: body.stateId,
      purpose: body.purpose,
    });

    const clientCache = new Map<string, ReturnType<typeof getRazorpayForState>>();
    const results: Array<{
      paymentId: string;
      razorpayOrderId: string | null;
      action: "marked_paid" | "would_mark_paid" | "still_unpaid" | "skipped" | "error";
      razorpayPaymentId?: string;
      razorpayStatus?: string;
      error?: string;
    }> = [];

    let markedPaid = 0;
    let stillUnpaid = 0;
    let skipped = 0;
    let errors = 0;

    for (const pay of pending) {
      const orderId = pay.razorpayOrderId;
      if (!orderId) {
        skipped += 1;
        results.push({
          paymentId: pay.id,
          razorpayOrderId: null,
          action: "skipped",
          error: "missing_order_id",
        });
        continue;
      }

      try {
        const cfg = await getRazorpayConfigForPayment(pay.purpose, pay.stateId);
        const cacheKey = `${cfg.razorpayKeyId}:${cfg.razorpayKeySecret}`;
        let rz = clientCache.get(cacheKey);
        if (!rz) {
          rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
          clientCache.set(cacheKey, rz);
        }

        const orderPayments = (await rz.orders.fetchPayments(orderId)) as RazorpayOrderPayments;
        const items = orderPayments.items ?? [];
        const captured =
          items.find((p) => p.status === "captured") ??
          items.find((p) => p.status === "authorized");

        if (!captured?.id) {
          stillUnpaid += 1;
          const latest = items[0];
          results.push({
            paymentId: pay.id,
            razorpayOrderId: orderId,
            action: "still_unpaid",
            razorpayStatus: latest?.status ?? "no_payments",
          });
          continue;
        }

        if (body.dryRun) {
          markedPaid += 1;
          results.push({
            paymentId: pay.id,
            razorpayOrderId: orderId,
            action: "would_mark_paid",
            razorpayPaymentId: captured.id,
            razorpayStatus: captured.status,
          });
          continue;
        }

        await applySuccessfulPayment(pay.id, captured.id);
        markedPaid += 1;
        results.push({
          paymentId: pay.id,
          razorpayOrderId: orderId,
          action: "marked_paid",
          razorpayPaymentId: captured.id,
          razorpayStatus: captured.status,
        });
      } catch (e) {
        errors += 1;
        results.push({
          paymentId: pay.id,
          razorpayOrderId: orderId,
          action: "error",
          error: e instanceof Error ? e.message : "reconcile_failed",
        });
      }
    }

    res.json({
      dryRun: body.dryRun,
      checked: pending.length,
      markedPaid,
      stillUnpaid,
      skipped,
      errors,
      results,
    });
  } catch (e) {
    next(e);
  }
}
