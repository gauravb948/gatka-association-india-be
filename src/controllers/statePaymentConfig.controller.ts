import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import { statePaymentConfigSchema } from "../validators/state.validators.js";

function assertStateAdminOwnState(u: { role: string; stateId: string | null }, stateId: string) {
  if (u.role !== "STATE_ADMIN") return;
  if (!u.stateId || u.stateId !== stateId) {
    throw new AppError(403, "Cannot access another state's payment config", "FORBIDDEN_SCOPE");
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    if (!u.stateId) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_SCOPE");
    }
    const cfg = await statePaymentRepository.findByStateId(u.stateId);
    if (!cfg) throw new AppError(404, "Payment config not found");
    res.json({
      id: cfg.id,
      stateId: cfg.stateId,
      razorpayKeyId: cfg.razorpayKeyId,
      hasKeySecret: Boolean(cfg.razorpayKeySecret),
      hasWebhookSecret: Boolean(cfg.webhookSecret),
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    next(e);
  }
}

export async function putMine(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    if (!u.stateId) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_SCOPE");
    }
    const body = statePaymentConfigSchema.parse(req.body);
    const cfg = await statePaymentRepository.upsertForState(
      u.stateId,
      {
        state: { connect: { id: u.stateId } },
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

/** GET config for a state: national admin (any) or state admin (own state only). */
export async function getByStateId(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const stateId = req.params.stateId;
    if (u.role !== "STATE_ADMIN") {
      throw new AppError(403, "Only state admins can use this endpoint", "FORBIDDEN_ROLE");
    }
    assertStateAdminOwnState(u, stateId);

    const cfg = await statePaymentRepository.findByStateId(stateId);
    if (!cfg) throw new AppError(404, "Payment config not found");
    res.json({
      id: cfg.id,
      stateId: cfg.stateId,
      razorpayKeyId: cfg.razorpayKeyId,
      hasKeySecret: Boolean(cfg.razorpayKeySecret),
      hasWebhookSecret: Boolean(cfg.webhookSecret),
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    next(e);
  }
}

/** PUT config for a state: state admin for own state only. */
export async function putByStateId(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const stateId = req.params.stateId;
    if (u.role !== "STATE_ADMIN") {
      throw new AppError(403, "Only state admins can use this endpoint", "FORBIDDEN_ROLE");
    }
    assertStateAdminOwnState(u, stateId);

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
