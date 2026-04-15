import type { NextFunction, Request, Response } from "express";
import { EntityStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { buildRegistrationAuthPayload } from "../lib/registrationSessionResponse.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as stateRepo from "../repositories/state.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  stateRegistrationCreateSchema,
  stateRegistrationDecisionSchema,
  stateRegistrationListQuerySchema,
  stateRegistrationStatusSchema,
} from "../validators/stateRegistration.validators.js";

async function assertApplicantCredentialsAvailable(
  email: string,
  userName: string,
  ctx?: { previousEmail?: string; previousUserName?: string; previousUserId?: string | null }
) {
  if (email !== ctx?.previousEmail) {
    const u = await userRepository.findByEmail(email);
    if (u && u.id !== ctx?.previousUserId) {
      throw new AppError(409, "Email already in use", "EMAIL_IN_USE");
    }
  }
  if (userName !== ctx?.previousUserName) {
    const u2 = await userRepository.findByUsername(userName);
    if (u2 && u2.id !== ctx?.previousUserId) {
      throw new AppError(409, "Username already in use", "USERNAME_IN_USE");
    }
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = stateRegistrationCreateSchema.parse(req.body);

    const state = await stateRepo.findById(body.stateId);
    if (!state) throw new AppError(404, "State not found");
    if (!state.isEnabled) {
      throw new AppError(400, "State is not enabled by national admin yet", "STATE_NOT_ENABLED");
    }

    const existing = await stateRegistrationRepo.findByStateId(body.stateId);
    if (existing && existing.status === EntityStatus.ACCEPTED) {
      throw new AppError(409, "State already has an accepted registration", "ALREADY_REGISTERED");
    }

    const passwordHash = await hashPassword(body.password);

    const regUncheckedBase: Omit<
      Prisma.StateRegistrationUncheckedUpdateInput,
      "stateId" | "userId" | "paymentId"
    > = {
      firstName: body.firstName,
      lastName: body.lastName,
      userName: body.userName,
      email: body.email,
      mobileNo: body.mobileNo,
      address: body.address,
      passportPhotoUrl: body.passportPhotoUrl ?? null,
      status: EntityStatus.PENDING,
      statusReason: null,
    };

    const userCreateBase: Prisma.UserCreateInput = {
      email: body.email,
      username: body.userName,
      phone: body.mobileNo,
      passwordHash,
      role: Role.STATE_ADMIN,
      status: EntityStatus.PENDING,
      statusReason: "Awaiting state registration approval",
      isActive: true,
      state: { connect: { id: body.stateId } },
    };

    let userIdOut: string;

    if (existing) {
      await assertApplicantCredentialsAvailable(body.email, body.userName, {
        previousEmail: existing.email,
        previousUserName: existing.userName,
        previousUserId: existing.userId,
      });

      userIdOut = await prisma.$transaction(async (tx) => {
        let uid = existing.userId;
        if (uid) {
          await tx.user.update({
            where: { id: uid },
            data: {
              email: body.email,
              username: body.userName,
              phone: body.mobileNo,
              passwordHash,
              state: { connect: { id: body.stateId } },
            },
          });
        } else {
          const u = await tx.user.create({ data: userCreateBase });
          uid = u.id;
        }
        await tx.stateRegistration.update({
          where: { id: existing.id },
          data: {
            ...regUncheckedBase,
            userId: uid,
          },
        });
        return uid;
      });

      const reg = await stateRegistrationRepo.findByStateId(body.stateId);
      if (!reg) throw new AppError(500, "Registration missing");
      const payload = await buildRegistrationAuthPayload(userIdOut, reg);
      return res.json(payload);
    }

    await assertApplicantCredentialsAvailable(body.email, body.userName);

    userIdOut = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userCreateBase });
      await tx.stateRegistration.create({
        data: {
          stateId: body.stateId,
          userId: user.id,
          ...regUncheckedBase,
        } as Prisma.StateRegistrationUncheckedCreateInput,
      });
      return user.id;
    });

    const reg = await stateRegistrationRepo.findByStateId(body.stateId);
    if (!reg) throw new AppError(500, "Registration missing");
    const payload = await buildRegistrationAuthPayload(userIdOut, reg);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function getByStateId(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await stateRegistrationRepo.findByStateId(req.params.stateId);
    if (!row) throw new AppError(404, "State registration not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Only national admins can list all state registrations", "FORBIDDEN_ROLE");
    }
    const q = stateRegistrationListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await stateRegistrationRepo.findManyPaginated({
      skip,
      take: q.pageSize,
      statuses: q.status,
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

export async function setStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Only national admins can approve/reject state registrations", "FORBIDDEN_ROLE");
    }

    const body = stateRegistrationStatusSchema.parse(req.body);
    const existing = await stateRegistrationRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "State registration not found");

    const updateData: Prisma.StateRegistrationUpdateInput = {
      status: body.status,
      statusReason: body.statusReason ?? null,
    };

    const row = await stateRegistrationRepo.update(existing.id, updateData);

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
            statusReason: body.statusReason ?? "State registration rejected",
            isActive: false,
          },
        });
      }
    }

    if (body.status === EntityStatus.ACCEPTED) {
      await prisma.state.update({
        where: { id: existing.stateId },
        data: { isEnabled: true },
      });
    }

    const refreshed = await stateRegistrationRepo.findById(existing.id);
    res.json(refreshed ?? row);
  } catch (e) {
    next(e);
  }
}

export async function decide(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    if (actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Only national admins can approve/reject state registrations", "FORBIDDEN_ROLE");
    }

    const body = stateRegistrationDecisionSchema.parse(req.body);
    const existing = await stateRegistrationRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "State registration not found");

    const nextStatus = body.decision === "ACCEPT" ? EntityStatus.ACCEPTED : EntityStatus.REJECTED;
    const reason = body.reason ?? (nextStatus === EntityStatus.REJECTED ? "State registration rejected" : undefined);

    const updateData: Prisma.StateRegistrationUpdateInput = {
      status: nextStatus,
      statusReason: reason ?? null,
    };

    const row = await stateRegistrationRepo.update(existing.id, updateData);

    if (existing.userId) {
      if (nextStatus === EntityStatus.ACCEPTED) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            status: EntityStatus.ACCEPTED,
            statusReason: null,
            isActive: true,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            status: EntityStatus.REJECTED,
            statusReason: reason ?? "State registration rejected",
            isActive: false,
          },
        });
      }
    }

    if (nextStatus === EntityStatus.ACCEPTED) {
      await prisma.state.update({
        where: { id: existing.stateId },
        data: { isEnabled: true },
      });
    }

    const refreshed = await stateRegistrationRepo.findById(existing.id);
    res.json(refreshed ?? row);
  } catch (e) {
    next(e);
  }
}
