import type { EntityStatus, Prisma, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { validatedOptionalGeoClauses } from "../lib/userListFilters.js";
import { hierarchyGeoWhere } from "../lib/userListScope.js";
import { userHierarchyListQuerySchema } from "../validators/userList.validators.js";

function buildListWhere(
  targetRole: Role,
  geo: Prisma.UserWhereInput,
  optional: Prisma.UserWhereInput[],
  statuses?: EntityStatus[]
): Prisma.UserWhereInput {
  const parts: Prisma.UserWhereInput[] = [{ role: targetRole }];
  if (Object.keys(geo).length > 0) {
    parts.push(geo);
  }
  parts.push(...optional);
  if (statuses?.length) {
    parts.push({ status: { in: statuses } });
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
}

function listItemUserTypeProfile(item: any, targetRole: Role) {
  switch (targetRole) {
    case "PLAYER":
      return item.playerProfile ?? null;
    case "COACH":
      return item.coachProfile ?? null;
    case "REFEREE":
      return item.refereeProfile ?? null;
    case "VOLUNTEER":
      return item.volunteerProfile ?? null;
    case "TRAINING_CENTER":
      return item.trainingCenter ?? null;
    case "STATE_ADMIN":
      return item.stateRegistrationApplicant ?? null;
    case "DISTRICT_ADMIN":
      return item.districtRegistrationApplicant ?? null;
    default:
      return null;
  }
}

export function listUsersByRole(targetRole: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.dbUser!;
      const q = userHierarchyListQuerySchema.parse(req.query);
      const geo = hierarchyGeoWhere(actor, targetRole);
      const optional = await validatedOptionalGeoClauses(actor, q);
      const where = buildListWhere(targetRole, geo, optional, q.status);
      const skip = (q.page - 1) * q.pageSize;
      const [items, total] = await userRepository.findManyPaginatedWithWhere({
        where,
        skip,
        take: q.pageSize,
      });
      const enrichedItems = items.map((item) => {
        const {
          playerProfile,
          coachProfile,
          refereeProfile,
          volunteerProfile,
          stateRegistrationApplicant,
          districtRegistrationApplicant,
          ...rest
        } = item as any;
        return {
          ...rest,
          userTypeProfile: listItemUserTypeProfile(item, targetRole),
        };
      });
      const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
      res.json({
        items: enrichedItems,
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages,
        role: targetRole,
      });
    } catch (e) {
      next(e);
    }
  };
}

async function getUserTypeProfile(userId: string, role: Role) {
  switch (role) {
    case "PLAYER": {
      const row = await prisma.playerProfile.findUnique({ where: { userId } });
      return row ?? null;
    }
    case "COACH": {
      const row = await prisma.coachProfile.findUnique({ where: { userId } });
      return row ?? null;
    }
    case "REFEREE": {
      const row = await prisma.refereeProfile.findUnique({ where: { userId } });
      return row ?? null;
    }
    case "VOLUNTEER": {
      const row = await prisma.volunteerProfile.findUnique({ where: { userId } });
      return row ?? null;
    }
    case "TRAINING_CENTER": {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { trainingCenterId: true } });
      if (!u?.trainingCenterId) return null;
      return prisma.trainingCenter.findUnique({
        where: { id: u.trainingCenterId },
        include: { district: { include: { state: true } } },
      });
    }
    case "STATE_ADMIN": {
      return prisma.stateRegistration.findUnique({
        where: { userId },
        include: {
          state: true,
          payment: { select: { id: true, purpose: true, amountPaise: true, status: true, createdAt: true } },
        },
      });
    }
    case "DISTRICT_ADMIN": {
      return prisma.districtRegistration.findUnique({
        where: { userId },
        include: {
          state: true,
          district: true,
          payment: { select: { id: true, purpose: true, amountPaise: true, status: true, createdAt: true } },
        },
      });
    }
    default:
      return null;
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const userId = req.params.id;

    // Allow anyone to view their own profile detail.
    if (actor.id === userId) {
      const self = await userRepository.findByIdForLoginResponse(userId);
      if (!self) throw new AppError(404, "User not found");
      const userTypeProfile = await getUserTypeProfile(self.id, self.role);
      return res.json({ user: self, userTypeProfile });
    }

    const target = await userRepository.findByIdRoleOnly(userId);
    if (!target) throw new AppError(404, "User not found");

    const geo = hierarchyGeoWhere(actor, target.role);
    const inScope = await userRepository.findByIdWithinScope(userId, geo);
    if (!inScope) {
      throw new AppError(403, "You cannot view this user at your access level", "FORBIDDEN_SCOPE");
    }

    const full = await userRepository.findByIdForLoginResponse(userId);
    if (!full) throw new AppError(404, "User not found");
    const userTypeProfile = await getUserTypeProfile(full.id, full.role);
    res.json({ user: full, userTypeProfile });
  } catch (e) {
    next(e);
  }
}
