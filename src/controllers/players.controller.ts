import type { NextFunction, Request, Response } from "express";
import * as playerRepository from "../repositories/player.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import { AppError } from "../lib/errors.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import {
  playerDistrictBlacklistSchema,
  playerRenewalPaymentSchema,
  playerTcDisableSchema,
} from "../validators/player.validators.js";

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await playerRepository.findProfileWithGeo(req.dbUser!.id);
    if (!p) throw new AppError(404, "Profile not found");
    res.json(p);
  } catch (e) {
    next(e);
  }
}

export async function renewalPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const body = playerRenewalPaymentSchema.parse(req.body);
    const profile = await playerRepository.findProfileByUserId(req.dbUser!.id);
    if (!profile) throw new AppError(404, "Profile not found");
    if (profile.stateId !== body.stateId) {
      throw new AppError(400, "State mismatch");
    }
    const cfg = await statePaymentRepository.findByStateId(body.stateId);
    if (!cfg) throw new AppError(400, "Razorpay not configured for state");
    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const payment = await paymentRepository.createPayment({
      user: { connect: { id: req.dbUser!.id } },
      state: { connect: { id: body.stateId } },
      purpose: "PLAYER_RENEWAL",
      amountPaise: body.amountPaise,
      status: "PENDING",
    });
    const order = await rz.orders.create({
      amount: body.amountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: { paymentId: payment.id, purpose: "PLAYER_RENEWAL" },
    });
    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);
    res.status(201).json({
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amountPaise: body.amountPaise,
      keyId: cfg.razorpayKeyId,
    });
  } catch (e) {
    next(e);
  }
}

export async function verifyDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const profile = await playerRepository.findProfileByUserId(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.trainingCenterId !== u.trainingCenterId) {
      throw new AppError(403, "Player not at your TC");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      documentsVerifiedAt: new Date(),
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function tcDisable(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = playerTcDisableSchema.parse(req.body);
    const profile = await playerRepository.findProfileByUserId(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.trainingCenterId !== u.trainingCenterId) {
      throw new AppError(403, "Forbidden");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      tcDisabled: body.tcDisabled,
      tcDisabledRemarks: body.tcDisabledRemarks ?? null,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function districtBlacklist(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = playerDistrictBlacklistSchema.parse(req.body);
    const profile = await playerRepository.findProfileWithDistrict(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.districtId !== u.districtId) {
      throw new AppError(403, "Forbidden");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      isBlacklisted: body.isBlacklisted,
      blacklistRemarks: body.blacklistRemarks ?? null,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}
