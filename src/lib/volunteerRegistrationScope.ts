import type { Prisma } from "@prisma/client";
import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";
import type { DbUser } from "../types/user.js";
import type { VolunteerRegistrationListQuery } from "../validators/volunteerRegistration.validators.js";

/** Base visibility for volunteer registration records. */
export function volunteerRegistrationScopeWhere(actor: DbUser): Prisma.VolunteerRegistrationWhereInput {
  switch (actor.role) {
    case "NATIONAL_ADMIN":
      return {};
    case "STATE_ADMIN": {
      const stateId = actor.stateId;
      if (!stateId) {
        throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
      }
      return { stateId };
    }
    case "DISTRICT_ADMIN": {
      const districtId = actor.districtId;
      if (!districtId) {
        throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
      }
      return { districtId };
    }
    default:
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }
}

export async function validatedVolunteerRegistrationListFilters(
  actor: DbUser,
  q: VolunteerRegistrationListQuery
): Promise<{
  stateId?: string;
  districtId?: string;
  gender?: VolunteerRegistrationListQuery["gender"];
  maritalStatus?: VolunteerRegistrationListQuery["maritalStatus"];
  hasDisability?: boolean;
  status?: VolunteerRegistrationListQuery["status"];
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
}> {
  if (actor.role === "NATIONAL_ADMIN") {
    if (q.districtId && q.stateId) {
      const district = await prisma.district.findFirst({
        where: { id: q.districtId, stateId: q.stateId },
        select: { id: true },
      });
      if (!district) {
        throw new AppError(400, "District is not in the given state", "INVALID_DISTRICT");
      }
    } else if (q.districtId) {
      const district = await prisma.district.findUnique({
        where: { id: q.districtId },
        select: { id: true },
      });
      if (!district) {
        throw new AppError(400, "District not found", "INVALID_DISTRICT");
      }
    }
    return {
      stateId: q.stateId,
      districtId: q.districtId,
      gender: q.gender,
      maritalStatus: q.maritalStatus,
      hasDisability: q.hasDisability,
      status: q.status,
      search: q.search,
      createdFrom: q.createdFrom,
      createdTo: q.createdTo,
    };
  }

  if (actor.role === "STATE_ADMIN") {
    const stateId = actor.stateId;
    if (!stateId) {
      throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
    }
    if (q.stateId && q.stateId !== stateId) {
      throw new AppError(403, "stateId is outside your scope", "FORBIDDEN_FILTER");
    }
    if (q.districtId) {
      const district = await prisma.district.findFirst({
        where: { id: q.districtId, stateId },
        select: { id: true },
      });
      if (!district) {
        throw new AppError(400, "District not found in your state", "INVALID_DISTRICT");
      }
    }
    return {
      stateId,
      districtId: q.districtId,
      gender: q.gender,
      maritalStatus: q.maritalStatus,
      hasDisability: q.hasDisability,
      status: q.status,
      search: q.search,
      createdFrom: q.createdFrom,
      createdTo: q.createdTo,
    };
  }

  if (actor.role === "DISTRICT_ADMIN") {
    const districtId = actor.districtId;
    if (!districtId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    if (q.districtId && q.districtId !== districtId) {
      throw new AppError(403, "districtId is outside your scope", "FORBIDDEN_FILTER");
    }
    if (q.stateId && q.stateId !== actor.district?.state.id) {
      throw new AppError(403, "stateId is outside your scope", "FORBIDDEN_FILTER");
    }
    return {
      districtId,
      gender: q.gender,
      maritalStatus: q.maritalStatus,
      hasDisability: q.hasDisability,
      status: q.status,
      search: q.search,
      createdFrom: q.createdFrom,
      createdTo: q.createdTo,
    };
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

export async function assertVolunteerRegistrationInScope(actor: DbUser, id: string) {
  const scope = volunteerRegistrationScopeWhere(actor);
  const row = await prisma.volunteerRegistration.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      state: { select: { id: true, name: true, isEnabled: true } },
      district: { select: { id: true, name: true, stateId: true, isEnabled: true } },
    },
  });
  if (!row) {
    throw new AppError(404, "Volunteer registration not found", "VOLUNTEER_REGISTRATION_NOT_FOUND");
  }
  return row;
}
