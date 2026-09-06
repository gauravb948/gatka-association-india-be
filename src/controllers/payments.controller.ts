import crypto from "crypto";
import {
  EntityStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  type Prisma,
  type Role,
} from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { fetchCapturedPaymentForOrder, getRazorpayForState } from "../lib/razorpayClient.js";
import { getRazorpayConfigForPayment } from "../lib/razorpayConfig.js";
import { applySuccessfulPayment } from "../lib/paymentHandlers.js";
import { assertCanApproveManualPayment, canApproveManualPayment } from "../lib/manualPaymentAccess.js";
import {
  createRazorpayOrderSchema,
  verifyPaymentSchema,
  reconcileRazorpaySchema,
  createManualPaymentSchema,
  approveManualPaymentSchema,
  rejectManualPaymentSchema,
} from "../validators/payment.validators.js";

const ROLE_REGISTRATION_PURPOSE: Partial<Record<Role, PaymentPurpose>> = {
  STATE_ADMIN: PaymentPurpose.STATE_REGISTRATION,
  DISTRICT_ADMIN: PaymentPurpose.DISTRICT_REGISTRATION,
  TRAINING_CENTER: PaymentPurpose.TRAINING_CENTER_REGISTRATION,
  COACH: PaymentPurpose.COACH_REGISTRATION,
  REFEREE: PaymentPurpose.REFEREE_REGISTRATION,
  PLAYER: PaymentPurpose.PLAYER_REGISTRATION,
  VOLUNTEER: PaymentPurpose.VOLUNTEER_REGISTRATION,
};

const MANUAL_REQUEST_REASON = "Manual payment requested; awaiting confirmation from your manager";

export async function createRazorpayOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createRazorpayOrderSchema.parse(req.body);
    const u = req.dbUser!;
    if (body.purpose === PaymentPurpose.COMPETITION_ENTRY_FEE) {
      throw new AppError(
        400,
        "Competition entry fees must be created from the competition fee-submission endpoint",
        "INVALID_PURPOSE"
      );
    }
    const cfg = await getRazorpayConfigForPayment(body.purpose, body.stateId, body.metadata);

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

    const cfg = await getRazorpayConfigForPayment(payment.purpose, payment.stateId, payment.metadata);

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
        const cfg = await getRazorpayConfigForPayment(pay.purpose, pay.stateId, pay.metadata);
        const cacheKey = `${cfg.razorpayKeyId}:${cfg.razorpayKeySecret}`;
        let rz = clientCache.get(cacheKey);
        if (!rz) {
          rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
          clientCache.set(cacheKey, rz);
        }

        const captured = await fetchCapturedPaymentForOrder(rz, orderId);

        if (!captured?.id) {
          stillUnpaid += 1;
          results.push({
            paymentId: pay.id,
            razorpayOrderId: orderId,
            action: "still_unpaid",
            razorpayStatus: "not_captured",
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

export async function createManualPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createManualPaymentSchema.parse(req.body);
    const u = req.dbUser!;

    if (u.status !== EntityStatus.PENDING) {
      throw new AppError(400, "Manual payment is only available before you finish registration", "INVALID_STATUS");
    }
    if (body.purpose === PaymentPurpose.COMPETITION_ENTRY_FEE) {
      throw new AppError(400, "Competition entry fees cannot use manual payment", "INVALID_PURPOSE");
    }

    const expectedPurpose = ROLE_REGISTRATION_PURPOSE[u.role as Role];
    if (!expectedPurpose || body.purpose !== expectedPurpose) {
      throw new AppError(400, "Payment purpose does not match your registration type", "INVALID_PURPOSE");
    }

    const fee = await prisma.rolePaymentFeeConfig.findUnique({
      where: { role: u.role },
      select: { feeAmountPaise: true },
    });
    if (!fee || fee.feeAmountPaise < 1) {
      throw new AppError(400, "No registration fee is due for your role", "FEE_NOT_REQUIRED");
    }
    if (body.amountPaise !== fee.feeAmountPaise) {
      throw new AppError(400, "Payment amount does not match the configured fee", "INVALID_AMOUNT");
    }

    const existing = await paymentRepository.findPendingManualByUser(u.id);
    if (existing) {
      throw new AppError(409, "A manual payment is already waiting for your manager", "MANUAL_PAYMENT_PENDING");
    }

    const meta: Record<string, unknown> =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};
    meta.method = "MANUAL";
    if (body.note) meta.note = body.note;

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

    const resolvedStateId =
      body.stateId ||
      u.stateId ||
      u.district?.state.id ||
      u.trainingCenter?.district.state.id ||
      '';
    if (!resolvedStateId) {
      throw new AppError(400, "A state is required to record this payment", "STATE_REQUIRED");
    }

    const payData: Prisma.PaymentCreateInput = {
      user: { connect: { id: u.id } },
      state: { connect: { id: resolvedStateId } },
      purpose: body.purpose,
      amountPaise: body.amountPaise,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.MANUAL,
      metadata: meta as Prisma.InputJsonValue,
    };
    if (body.sessionId) payData.session = { connect: { id: body.sessionId } };

    const payment = await paymentRepository.createPayment(payData);

    await prisma.user.update({
      where: { id: u.id },
      data: { statusReason: MANUAL_REQUEST_REASON },
    });

    const user = await userRepository.findByIdForLoginResponse(u.id);
    res.status(201).json({ payment, user });
  } catch (e) {
    next(e);
  }
}

export async function listPendingManualPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const rows = await paymentRepository.findPendingManualForReview();
    const visible = rows.filter((row) => canApproveManualPayment(actor, row.user, row.stateId));
    res.json(visible);
  } catch (e) {
    next(e);
  }
}

export async function approveManualPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = approveManualPaymentSchema.parse(req.body ?? {});
    const payment = await paymentRepository.findManualByIdForReview(req.params.id);
    if (!payment || payment.method !== PaymentMethod.MANUAL) {
      throw new AppError(404, "Manual payment not found", "PAYMENT_NOT_FOUND");
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError(400, "This payment is no longer waiting for approval", "INVALID_STATUS");
    }
    if (payment.user.status !== EntityStatus.PENDING) {
      throw new AppError(400, "This user has already completed payment", "INVALID_STATUS");
    }

    assertCanApproveManualPayment(actor, payment.user, payment.stateId);

    const meta =
      payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
        ? { ...(payment.metadata as Record<string, unknown>) }
        : {};
    meta.reviewedById = actor.id;
    meta.reviewNote = body.statusReason?.trim() || "Approved";

    await prisma.payment.update({
      where: { id: payment.id },
      data: { metadata: meta as Prisma.InputJsonValue },
    });

    await applySuccessfulPayment(payment.id);

    const refreshed = await paymentRepository.findManualByIdForReview(payment.id);
    res.json(refreshed ?? payment);
  } catch (e) {
    next(e);
  }
}

export async function rejectManualPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = rejectManualPaymentSchema.parse(req.body);
    const payment = await paymentRepository.findManualByIdForReview(req.params.id);
    if (!payment || payment.method !== PaymentMethod.MANUAL) {
      throw new AppError(404, "Manual payment not found", "PAYMENT_NOT_FOUND");
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError(400, "This payment is no longer waiting for approval", "INVALID_STATUS");
    }

    assertCanApproveManualPayment(actor, payment.user, payment.stateId);

    const meta =
      payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
        ? { ...(payment.metadata as Record<string, unknown>) }
        : {};
    meta.rejectedById = actor.id;
    meta.rejectReason = body.statusReason;

    await paymentRepository.markFailed(payment.id, meta as Prisma.InputJsonValue);

    if (payment.user.status === EntityStatus.PENDING) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { statusReason: `Manual payment declined: ${body.statusReason}` },
      });
    }

    const refreshed = await paymentRepository.findManualByIdForReview(payment.id);
    res.json(refreshed ?? payment);
  } catch (e) {
    next(e);
  }
}
