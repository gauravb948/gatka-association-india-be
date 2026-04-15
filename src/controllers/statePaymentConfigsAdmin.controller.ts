import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import { statePaymentConfigSchema } from "../validators/state.validators.js";
import { statePaymentConfigListQuerySchema } from "../validators/statePaymentConfig.validators.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = statePaymentConfigListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await statePaymentRepository.findManyPaginated({
      skip,
      take: q.pageSize,
      stateId: q.stateId,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items: items.map((cfg) => ({
        id: cfg.id,
        stateId: cfg.stateId,
        state: cfg.state,
        razorpayKeyId: cfg.razorpayKeyId,
        hasKeySecret: Boolean(cfg.razorpayKeySecret),
        hasWebhookSecret: Boolean(cfg.webhookSecret),
        updatedAt: cfg.updatedAt,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const stateId = req.params.stateId;
    if (!stateId) throw new AppError(400, "Missing stateId");
    const body = statePaymentConfigSchema.parse(req.body);
    const cfg = await statePaymentRepository.upsertForState(
      stateId,
      {
        state: { connect: { id: stateId } },
        razorpayKeyId: body.razorpayKeyId,
        razorpayKeySecret: body.razorpayKeySecret,
        webhookSecret: body.webhookSecret,
      },
      {
        razorpayKeyId: body.razorpayKeyId,
        razorpayKeySecret: body.razorpayKeySecret,
        webhookSecret: body.webhookSecret,
      }
    );
    res.json({
      id: cfg.id,
      stateId: cfg.stateId,
      razorpayKeyId: cfg.razorpayKeyId,
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    next(e);
  }
}

