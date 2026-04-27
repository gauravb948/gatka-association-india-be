import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as nationalPaymentRepository from "../repositories/nationalPayment.repository.js";
import { statePaymentConfigSchema } from "../validators/state.validators.js";

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const cfg = await nationalPaymentRepository.findSingleton();
    if (!cfg) throw new AppError(404, "National payment config not found");
    res.json({
      id: cfg.id,
      razorpayKeyId: cfg.razorpayKeyId,
      hasKeySecret: Boolean(cfg.razorpayKeySecret),
      hasWebhookSecret: Boolean(cfg.webhookSecret),
      createdAt: cfg.createdAt,
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    next(e);
  }
}

export async function put(req: Request, res: Response, next: NextFunction) {
  try {
    const body = statePaymentConfigSchema.parse(req.body);
    const cfg = await nationalPaymentRepository.upsertSingleton({
      razorpayKeyId: body.razorpayKeyId,
      razorpayKeySecret: body.razorpayKeySecret,
      webhookSecret: body.webhookSecret,
    });
    res.json({
      id: cfg.id,
      razorpayKeyId: cfg.razorpayKeyId,
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    next(e);
  }
}
