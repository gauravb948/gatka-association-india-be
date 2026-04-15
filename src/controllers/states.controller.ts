import type { NextFunction, Request, Response } from "express";
import * as stateRepository from "../repositories/state.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import { AppError } from "../lib/errors.js";
import {
  createStateSchema,
  patchStateSchema,
  stateListQuerySchema,
  statePaymentConfigSchema,
} from "../validators/state.validators.js";

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = stateListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await stateRepository.findManyPublicPaginated({
      skip,
      take: q.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** Same payload shape as `listPublic`, but only states with accepted state-body registration and payment config. */
export async function listPublicRegistrationAccepted(req: Request, res: Response, next: NextFunction) {
  try {
    const q = stateListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await stateRepository.findManyPublicWithAcceptedRegistrationPaginated({
      skip,
      take: q.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const id = req.params.id;
    if (u.role === "STATE_ADMIN") {
      if (u.stateId !== id) {
        throw new AppError(403, "Cannot view other state", "FORBIDDEN_SCOPE");
      }
    } else if (u.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }
    const row = await stateRepository.findByIdWithRelations(id);
    if (!row) throw new AppError(404, "State not found");
  
    res.json({ ...row });
  } catch (e) {
    next(e);
  }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const q = stateListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await stateRepository.findManyAllPaginated({
      skip,
      take: q.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createStateSchema.parse(req.body);
    const s = await stateRepository.createState({
      name: body.name,
      code: body.code.toUpperCase(),
      isEnabled: body.isEnabled ?? true,
    });
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = patchStateSchema.parse(req.body);
    const s = await stateRepository.updateState(req.params.id, body);
    res.json(s);
  } catch (e) {
    next(e);
  }
}

export async function getPaymentConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const stateId = req.params.id;
    if (u.role !== "STATE_ADMIN") {
      throw new AppError(403, "Only state admins can use this endpoint", "FORBIDDEN_ROLE");
    }
    if (!u.stateId || u.stateId !== stateId) {
      throw new AppError(403, "Cannot access another state's payment config", "FORBIDDEN_SCOPE");
    }
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

export async function putPaymentConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const stateId = req.params.id;
    if (u.role !== "STATE_ADMIN") {
      throw new AppError(403, "Only state admins can use this endpoint", "FORBIDDEN_ROLE");
    }
    if (!u.stateId || u.stateId !== stateId) {
      throw new AppError(403, "Cannot access another state's payment config", "FORBIDDEN_SCOPE");
    }
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
