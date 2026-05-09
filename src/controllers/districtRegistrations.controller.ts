import type { NextFunction, Request, Response } from "express";
import { EntityStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { buildRegistrationAuthPayload } from "../lib/registrationSessionResponse.js";
import * as districtRegistrationRepo from "../repositories/districtRegistration.repository.js";
import * as districtRepo from "../repositories/district.repository.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  districtRegistrationCreateSchema,
  districtRegistrationListQuerySchema,
  districtRegistrationStatusSchema,
} from "../validators/districtRegistration.validators.js";

async function assertApplicantCredentialsAvailable(
  email: string,
  ctx?: { previousEmail?: string; previousUserId?: string | null }
) {
  if (email !== ctx?.previousEmail) {
    const u = await userRepository.findByEmail(email);
    if (u && u.id !== ctx?.previousUserId) {
      throw new AppError(409, "Email already in use", "EMAIL_IN_USE");
    }
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = districtRegistrationCreateSchema.parse(req.body);

    const district = await districtRepo.findByIdWithState(body.districtId);
    if (!district) throw new AppError(404, "District not found");

    if (body.stateId !== district.stateId) {
      throw new AppError(400, "Selected district does not belong to the selected state", "STATE_DISTRICT_MISMATCH");
    }

    const stateReg = await stateRegistrationRepo.findByStateId(district.stateId);
    if (!stateReg || stateReg.status !== EntityStatus.ACCEPTED) {
      throw new AppError(400, "Parent state registration must be accepted first", "STATE_NOT_REGISTERED");
    }

    const existing = await districtRegistrationRepo.findByDistrictId(body.districtId);
    if (existing && existing.status === EntityStatus.ACCEPTED) {
      throw new AppError(409, "District already has an accepted registration", "ALREADY_REGISTERED");
    }

    const passwordHash = await hashPassword(body.password);

    const regUncheckedBase: Omit<
      Prisma.DistrictRegistrationUncheckedUpdateInput,
      "stateId" | "districtId" | "userId" | "paymentId"
    > = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      mobileNo: body.mobileNo,
      address: body.address,
      passportPhotoUrl: body.passportPhotoUrl ?? null,
      status: EntityStatus.PENDING,
      statusReason: null,
    };

    const userCreateBase: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.mobileNo,
      passwordHash,
      role: Role.DISTRICT_ADMIN,
      status: EntityStatus.PENDING,
      statusReason: "Awaiting district registration approval",
      isActive: true,
      state: { connect: { id: body.stateId } },
      district: { connect: { id: body.districtId } },
    };

    let userIdOut: string;

    if (existing) {
      await assertApplicantCredentialsAvailable(body.email, {
        previousEmail: existing.email,
        previousUserId: existing.userId,
      });

      userIdOut = await prisma.$transaction(async (tx) => {
        let uid = existing.userId;
        if (uid) {
          await tx.user.update({
            where: { id: uid },
            data: {
              email: body.email,
              phone: body.mobileNo,
              passwordHash,
              state: { connect: { id: body.stateId } },
              district: { connect: { id: body.districtId } },
            },
          });
        } else {
          const u = await tx.user.create({ data: userCreateBase });
          uid = u.id;
        }
        await tx.districtRegistration.update({
          where: { id: existing.id },
          data: {
            ...regUncheckedBase,
            stateId: body.stateId,
            userId: uid,
          },
        });
        return uid;
      });

      const reg = await districtRegistrationRepo.findByDistrictId(body.districtId);
      if (!reg) throw new AppError(500, "Registration missing");
      const payload = await buildRegistrationAuthPayload(userIdOut, reg);
      return res.json(payload);
    }

    await assertApplicantCredentialsAvailable(body.email);

    userIdOut = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userCreateBase });
      await tx.districtRegistration.create({
        data: {
          stateId: body.stateId,
          districtId: body.districtId,
          userId: user.id,
          ...regUncheckedBase,
        } as Prisma.DistrictRegistrationUncheckedCreateInput,
      });
      return user.id;
    });

    const reg = await districtRegistrationRepo.findByDistrictId(body.districtId);
    if (!reg) throw new AppError(500, "Registration missing");
    const payload = await buildRegistrationAuthPayload(userIdOut, reg);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function getByDistrictId(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await districtRegistrationRepo.findByDistrictId(req.params.districtId);
    if (!row) throw new AppError(404, "District registration not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = districtRegistrationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;

    if (actor.role === "NATIONAL_ADMIN") {
      const [items, total] = await districtRegistrationRepo.findManyPaginated({
        skip,
        take: q.pageSize,
        statuses: q.status,
      });
      const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
      return res.json({
        items,
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages,
      });
    }
    if (actor.role === "STATE_ADMIN") {
      if (!actor.stateId) {
        throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_ROLE");
      }
      const [items, total] = await districtRegistrationRepo.findManyByStateIdPaginated({
        stateId: actor.stateId,
        skip,
        take: q.pageSize,
        statuses: q.status,
      });
      const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
      return res.json({
        items,
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages,
      });
    }
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  } catch (e) {
    next(e);
  }
}

export async function setStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await districtRegistrationRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "District registration not found");

    const canApprove =
      actor.role === "NATIONAL_ADMIN" ||
      (actor.role === "STATE_ADMIN" && actor.stateId === existing.district.stateId);
    if (!canApprove) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }

    const body = districtRegistrationStatusSchema.parse(req.body);

    const updateData: Prisma.DistrictRegistrationUpdateInput = {
      status: body.status,
      statusReason: body.statusReason ?? null,
    };

    const row = await districtRegistrationRepo.update(existing.id, updateData);

    if (existing.userId) {
      if (body.status === EntityStatus.ACCEPTED) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            status: EntityStatus.ACCEPTED,
            statusReason: null,
            isActive: true,
          },
        });
      } else if (body.status === EntityStatus.REJECTED) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            status: EntityStatus.REJECTED,
            statusReason: body.statusReason ?? "District registration rejected",
            isActive: false,
          },
        });
      }
    }

    if (body.status === EntityStatus.ACCEPTED) {
      await prisma.district.update({
        where: { id: existing.districtId },
        data: { isEnabled: true },
      });
    }

    const refreshed = await districtRegistrationRepo.findById(existing.id);
    res.json(refreshed ?? row);
  } catch (e) {
    next(e);
  }
}
