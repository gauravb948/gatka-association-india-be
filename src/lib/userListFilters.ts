import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";
import type { UserHierarchyListQuery } from "../validators/userList.validators.js";

function hasAnyGeoFilter(q: UserHierarchyListQuery) {
  return Boolean(q.stateId || q.districtId || q.trainingCenterId);
}

/**
 * Optional narrowing filters from query string, validated against the caller's hierarchy.
 * Returns clauses to AND into the listing `where` (may be empty).
 */
export async function validatedOptionalGeoClauses(
  actor: DbUser,
  q: UserHierarchyListQuery
): Promise<Prisma.UserWhereInput[]> {
  if (!hasAnyGeoFilter(q)) return [];

  if (actor.role === "TRAINING_CENTER") {
    throw new AppError(403, "Extra geography filters are not allowed for this role", "FORBIDDEN_FILTER");
  }

  if (actor.role === "NATIONAL_ADMIN") {
    const clauses: Prisma.UserWhereInput[] = [];
    if (q.trainingCenterId) {
      clauses.push({ trainingCenterId: q.trainingCenterId });
    } else if (q.districtId) {
      clauses.push({
        OR: [{ districtId: q.districtId }, { trainingCenter: { districtId: q.districtId } }],
      });
    } else if (q.stateId) {
      clauses.push({
        OR: [
          { stateId: q.stateId },
          { district: { stateId: q.stateId } },
          { trainingCenter: { district: { stateId: q.stateId } } },
        ],
      });
    }
    return clauses;
  }

  if (actor.role === "STATE_ADMIN") {
    const stateId = actor.stateId;
    if (!stateId) {
      throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
    }
    if (q.stateId && q.stateId !== stateId) {
      throw new AppError(403, "stateId is outside your scope", "FORBIDDEN_FILTER");
    }
    const clauses: Prisma.UserWhereInput[] = [];
    if (q.trainingCenterId && q.districtId) {
      const tc = await prisma.trainingCenter.findFirst({
        where: { id: q.trainingCenterId, districtId: q.districtId, district: { stateId } },
        select: { id: true },
      });
      if (!tc) {
        throw new AppError(
          400,
          "Training center is not in the given district or state",
          "INVALID_TRAINING_CENTER"
        );
      }
      clauses.push({ trainingCenterId: q.trainingCenterId });
    } else if (q.trainingCenterId) {
      const tc = await prisma.trainingCenter.findFirst({
        where: { id: q.trainingCenterId, district: { stateId } },
        select: { id: true },
      });
      if (!tc) {
        throw new AppError(400, "Training center not found in your state", "INVALID_TRAINING_CENTER");
      }
      clauses.push({ trainingCenterId: q.trainingCenterId });
    } else if (q.districtId) {
      const dist = await prisma.district.findFirst({
        where: { id: q.districtId, stateId },
        select: { id: true },
      });
      if (!dist) {
        throw new AppError(400, "District not found in your state", "INVALID_DISTRICT");
      }
      clauses.push({
        OR: [{ districtId: q.districtId }, { trainingCenter: { districtId: q.districtId } }],
      });
    }
    return clauses;
  }

  if (actor.role === "DISTRICT_ADMIN") {
    const dId = actor.districtId;
    const expectedStateId = actor.district?.state.id;
    if (!dId || !expectedStateId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    if (q.stateId && q.stateId !== expectedStateId) {
      throw new AppError(403, "stateId is outside your scope", "FORBIDDEN_FILTER");
    }
    if (q.districtId && q.districtId !== dId) {
      throw new AppError(403, "districtId is outside your scope", "FORBIDDEN_FILTER");
    }
    const clauses: Prisma.UserWhereInput[] = [];
    if (q.trainingCenterId) {
      const tc = await prisma.trainingCenter.findFirst({
        where: { id: q.trainingCenterId, districtId: dId },
        select: { id: true },
      });
      if (!tc) {
        throw new AppError(400, "Training center not found in your district", "INVALID_TRAINING_CENTER");
      }
      clauses.push({ trainingCenterId: q.trainingCenterId });
    }
    return clauses;
  }

  return [];
}
