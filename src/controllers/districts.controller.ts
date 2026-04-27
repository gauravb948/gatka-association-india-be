import type { NextFunction, Request, Response } from "express";
import * as districtRepository from "../repositories/district.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import { AppError } from "../lib/errors.js";
import {
  createDistrictSchema,
  districtByStateIdsBodySchema,
  districtListQuerySchema,
  patchDistrictSchema,
} from "../validators/district.validators.js";

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const q = districtListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await districtRepository.findManyPublicByStatePaginated(
      req.params.stateId,
      { skip, take: q.pageSize }
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** Same payload shape as `listPublicByState`, but only districts with accepted district-body registration. */
export async function listPublicByStateRegistrationAccepted(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const q = districtListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] =
      await districtRepository.findManyPublicByStateWithAcceptedRegistrationPaginated(
        req.params.stateId,
        { skip, take: q.pageSize }
      );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** Public: all enabled districts with ACCEPTED district registration across one or more states (deduped `stateIds`). */
export async function listPublicByStatesRegistrationAccepted(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = districtByStateIdsBodySchema.parse(req.body);
    const stateIds = [...new Set(body.stateIds)];
    const items = await districtRepository.findManyWithAcceptedRegistrationByStateIds(stateIds);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const id = req.params.id;
    const row = await districtRepository.findByIdWithRelations(id);
    if (!row) throw new AppError(404, "District not found");
    if (u.role === "NATIONAL_ADMIN") {
      // ok
    } else if (u.role === "STATE_ADMIN") {
      if (u.stateId !== row.stateId) {
        throw new AppError(403, "Cannot view district in other state", "FORBIDDEN_SCOPE");
      }
    } else if (u.role === "DISTRICT_ADMIN") {
      if (u.districtId !== row.id) {
        throw new AppError(403, "Cannot view other district", "FORBIDDEN_SCOPE");
      }
    } else {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }
    const fullCfg = await statePaymentRepository.findByStateId(row.stateId);
    const statePaymentConfig =
      row.state.paymentConfig && fullCfg
        ? {
            ...row.state.paymentConfig,
            hasKeySecret: Boolean(fullCfg.razorpayKeySecret),
            hasWebhookSecret: Boolean(fullCfg.webhookSecret),
          }
        : row.state.paymentConfig;
    res.json({
      ...row,
      state: {
        ...row.state,
        paymentConfig: statePaymentConfig,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function listByState(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    if (u.role === "STATE_ADMIN" && u.stateId !== req.params.stateId) {
      throw new AppError(403, "Cannot view other state");
    }
    const q = districtListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await districtRepository.findManyByStatePaginated(req.params.stateId, {
      skip,
      take: q.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

export async function createForState(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    if (u.role === "STATE_ADMIN" && u.stateId !== req.params.stateId) {
      throw new AppError(403, "Cannot modify other state");
    }
    const body = createDistrictSchema.parse(req.body);
    const state = await stateRepository.findById(req.params.stateId);
    if (!state?.isEnabled && u.role !== "NATIONAL_ADMIN") {
      throw new AppError(400, "State must be enabled");
    }
    const d = await districtRepository.createDistrict({
      state: { connect: { id: req.params.stateId } },
      name: body.name,
      isEnabled: body.isEnabled ?? true,
    });
    res.status(201).json(d);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const existing = await districtRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "District not found");
    if (u.role === "STATE_ADMIN" && u.stateId !== existing.stateId) {
      throw new AppError(403, "Cannot modify other state");
    }
    const body = patchDistrictSchema.parse(req.body);
    const d = await districtRepository.updateDistrict(req.params.id, body);
    res.json(d);
  } catch (e) {
    next(e);
  }
}
