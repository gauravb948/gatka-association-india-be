import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { hashPassword } from "../lib/password.js";
import {
  adminUserCreateSchema,
  adminUserListQuerySchema,
} from "../validators/adminUser.validators.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = adminUserListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await userRepository.findManyPaginatedForAdminList({
      skip,
      take: q.pageSize,
      statuses: q.status,
      roles: q.userType,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = adminUserCreateSchema.parse(req.body);
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email exists");
    if (body.role === "STATE_ADMIN" && !body.stateId) {
      throw new AppError(400, "stateId required");
    }
    if (body.role === "DISTRICT_ADMIN" && (!body.stateId || !body.districtId)) {
      throw new AppError(400, "stateId and districtId required");
    }
    if (
      body.role === "TRAINING_CENTER" &&
      (!body.stateId || !body.districtId || !body.trainingCenterId)
    ) {
      throw new AppError(400, "stateId, districtId, trainingCenterId required");
    }
    const passwordHash = await hashPassword(body.password);
    const data: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: body.role,
      isSuperNational: body.isSuperNational ?? false,
    };
    if (body.stateId) data.state = { connect: { id: body.stateId } };
    if (body.districtId) data.district = { connect: { id: body.districtId } };
    if (body.trainingCenterId) {
      data.trainingCenter = { connect: { id: body.trainingCenterId } };
    }
    const user = await userRepository.createAdminUser(data);
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
}
