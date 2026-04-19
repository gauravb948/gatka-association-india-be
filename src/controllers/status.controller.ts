import type { NextFunction, Request, Response } from "express";
import { EntityStatus, Role } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import {
  statusChangeBodySchema,
  trainingCenterStatusChangeBodySchema,
} from "../validators/status.validators.js";
import { prisma } from "../lib/prisma.js";

const roleRank: Record<Role, number> = {
  NATIONAL_ADMIN: 5,
  STATE_ADMIN: 4,
  DISTRICT_ADMIN: 3,
  TRAINING_CENTER: 2,
  PLAYER: 1,
  COACH: 1,
  VOLUNTEER: 1,
  REFEREE: 1,
};

function assertCanManageTarget(actor: { role: Role }, target: { role: Role }) {
  if (roleRank[actor.role] <= roleRank[target.role]) {
    throw new AppError(403, "Cannot manage target at same/higher level", "FORBIDDEN_HIERARCHY");
  }
}

export async function setTrainingCenterStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actor = req.dbUser!;
    const body = trainingCenterStatusChangeBodySchema.parse(req.body);
    const existing = await prisma.trainingCenter.findUnique({
      where: { id: req.params.id },
      select: { id: true, districtId: true, district: { select: { stateId: true } } },
    });
    if (!existing) throw new AppError(404, "Training center not found");

    const allowed =
      actor.role === "NATIONAL_ADMIN" ||
      (actor.role === "STATE_ADMIN" && actor.stateId === existing.district.stateId) ||
      (actor.role === "DISTRICT_ADMIN" && actor.districtId === existing.districtId);
    if (!allowed) throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");

    const reason = body.status === "ACCEPTED" ? null : body.statusReason!;
    const row = await prisma.trainingCenter.update({
      where: { id: req.params.id },
      data: {
        status: body.status as EntityStatus,
        statusReason: reason,
        isEnabled: body.status === "ACCEPTED",
      },
    });
    await prisma.user.updateMany({
      where: { trainingCenterId: req.params.id, role: Role.TRAINING_CENTER },
      data: {
        status: body.status as EntityStatus,
        statusReason: reason,
        isActive: body.status === "ACCEPTED",
        disabledReason: body.status === "ACCEPTED" ? null : reason,
      },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function setUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = statusChangeBodySchema.parse(req.body);
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        role: true,
        stateId: true,
        districtId: true,
        trainingCenterId: true,
      },
    });
    if (!target) throw new AppError(404, "User not found");

    assertCanManageTarget(actor as { role: Role }, target);

    const allowed =
      actor.role === "NATIONAL_ADMIN" ||
      (actor.role === "STATE_ADMIN" && actor.stateId && actor.stateId === target.stateId) ||
      (actor.role === "DISTRICT_ADMIN" &&
        actor.districtId &&
        actor.districtId === target.districtId) ||
      (actor.role === "TRAINING_CENTER" &&
        actor.trainingCenterId &&
        actor.trainingCenterId === target.trainingCenterId &&
        ["PLAYER", "COACH", "VOLUNTEER", "REFEREE"].includes(target.role));

    if (!allowed) throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");

    const nextStatus = body.status as EntityStatus;
    const row = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: target.id },
        data: {
          status: nextStatus,
          statusReason: body.statusReason ?? null,
          isActive: body.status === "ACCEPTED",
          disabledReason:
            body.status === "ACCEPTED" ? null : body.statusReason ?? "Status not accepted",
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          statusReason: true,
          isActive: true,
        },
      });

      // Keep admin-registration records in sync when the target is a state/district user.
      if (target.role === "STATE_ADMIN") {
        await tx.stateRegistration.updateMany({
          where: { userId: target.id },
          data: {
            status: nextStatus,
            statusReason: body.statusReason ?? null,
          },
        });
        if (nextStatus === EntityStatus.ACCEPTED && target.stateId) {
          await tx.state.update({ where: { id: target.stateId }, data: { isEnabled: true } });
        }
      }

      if (target.role === "DISTRICT_ADMIN") {
        await tx.districtRegistration.updateMany({
          where: { userId: target.id },
          data: {
            status: nextStatus,
            statusReason: body.statusReason ?? null,
          },
        });
        if (nextStatus === EntityStatus.ACCEPTED && target.districtId) {
          await tx.district.update({ where: { id: target.districtId }, data: { isEnabled: true } });
        }
      }

      return updatedUser;
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
}

