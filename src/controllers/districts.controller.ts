import type { NextFunction, Request, Response } from "express";
import type { DbUser } from "../types/user.js";
import * as districtRepository from "../repositories/district.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import {
  bulkDistrictsCreateSchema,
  createDistrictSchema,
  createDistrictWithStateBodySchema,
  districtByStateIdsBodySchema,
  districtListQuerySchema,
  patchDistrictSchema,
  patchDistrictWithIdBodySchema,
} from "../validators/district.validators.js";

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

async function persistOneDistrict(stateId: string, body: { name: string; isEnabled?: boolean }) {
  try {
    return await districtRepository.createDistrict({
      state: { connect: { id: stateId } },
      name: body.name,
      isEnabled: body.isEnabled ?? true,
    });
  } catch (e: unknown) {
    if (isPrismaUniqueViolation(e)) {
      throw new AppError(
        409,
        "A district with this name already exists in this state",
        "DISTRICT_DUPLICATE"
      );
    }
    throw e;
  }
}

async function updateDistrictAuthorized(
  u: DbUser,
  districtId: string,
  data: { name?: string; isEnabled?: boolean }
) {
  const existing = await districtRepository.findById(districtId);
  if (!existing) throw new AppError(404, "District not found");
  if (u.role === "STATE_ADMIN" && u.stateId !== existing.stateId) {
    throw new AppError(403, "Cannot modify other state");
  }
  try {
    return await districtRepository.updateDistrict(districtId, data);
  } catch (e: unknown) {
    if (isPrismaUniqueViolation(e)) {
      throw new AppError(
        409,
        "A district with this name already exists in this state",
        "DISTRICT_DUPLICATE"
      );
    }
    throw e;
  }
}

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
    const d = await persistOneDistrict(req.params.stateId, body);
    res.status(201).json(d);
  } catch (e) {
    next(e);
  }
}

/** `POST /districts` — create one district; `stateId` in JSON (same semantics as `POST /districts/state/:stateId`). */
export async function createOne(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const parsed = createDistrictWithStateBodySchema.parse(req.body);
    const { stateId, ...body } = parsed;
    if (u.role === "STATE_ADMIN" && u.stateId !== stateId) {
      throw new AppError(403, "Cannot modify other state");
    }
    const state = await stateRepository.findById(stateId);
    if (!state?.isEnabled && u.role !== "NATIONAL_ADMIN") {
      throw new AppError(400, "State must be enabled");
    }
    const d = await persistOneDistrict(stateId, body);
    res.status(201).json(d);
  } catch (e) {
    next(e);
  }
}

/** Bulk create districts under a state (same auth rules as single create); all inserts in one transaction. */
export async function bulkCreateForState(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const stateId = req.params.stateId;
    if (u.role === "STATE_ADMIN" && u.stateId !== stateId) {
      throw new AppError(403, "Cannot modify other state");
    }
    const body = bulkDistrictsCreateSchema.parse(req.body);
    const state = await stateRepository.findById(stateId);
    if (!state?.isEnabled && u.role !== "NATIONAL_ADMIN") {
      throw new AppError(400, "State must be enabled");
    }

    const names = body.districts.map((d) => d.name);
    if (new Set(names).size !== names.length) {
      throw new AppError(400, "Duplicate district names in request", "DUPLICATE_IN_REQUEST");
    }

    try {
      const created = await prisma.$transaction(
        body.districts.map((item) =>
          prisma.district.create({
            data: {
              stateId,
              name: item.name,
              isEnabled: item.isEnabled ?? true,
            },
          })
        )
      );
      res.status(201).json({ districts: created });
    } catch (e: unknown) {
      if (isPrismaUniqueViolation(e)) {
        throw new AppError(
          409,
          "One or more district names already exist in this state",
          "DISTRICT_DUPLICATE"
        );
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = patchDistrictSchema.parse(req.body);
    const d = await updateDistrictAuthorized(u, req.params.id, body);
    res.json(d);
  } catch (e) {
    next(e);
  }
}

/** `PATCH /districts` — update one district; `id` in JSON (same semantics as `PATCH /districts/:id`). */
export async function patchOne(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const parsed = patchDistrictWithIdBodySchema.parse(req.body);
    const { id, ...data } = parsed;
    const d = await updateDistrictAuthorized(u, id, data);
    res.json(d);
  } catch (e) {
    next(e);
  }
}
