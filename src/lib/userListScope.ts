import type { Prisma, Role } from "@prisma/client";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";

/** Roles that may appear in directory-style listings. */
const ACTOR_TO_LISTABLE_TARGETS: Record<Role, readonly Role[]> = {
  NATIONAL_ADMIN: [
    "PLAYER",
    "COACH",
    "REFEREE",
    "VOLUNTEER",
    "TRAINING_CENTER",
    "DISTRICT_ADMIN",
    "STATE_ADMIN",
    "NATIONAL_ADMIN",
  ],
  STATE_ADMIN: [
    "PLAYER",
    "COACH",
    "REFEREE",
    "VOLUNTEER",
    "TRAINING_CENTER",
    "DISTRICT_ADMIN",
    "STATE_ADMIN",
  ],
  DISTRICT_ADMIN: [
    "PLAYER",
    "COACH",
    "REFEREE",
    "VOLUNTEER",
    "TRAINING_CENTER",
    "DISTRICT_ADMIN",
  ],
  TRAINING_CENTER: ["PLAYER", "COACH"],
  COACH: [],
  REFEREE: [],
  PLAYER: [],
  VOLUNTEER: [],
};

export function assertCanListUserType(actorRole: Role, targetRole: Role) {
  const allowed = ACTOR_TO_LISTABLE_TARGETS[actorRole];
  if (!allowed.includes(targetRole)) {
    throw new AppError(
      403,
      "You cannot list this user type at your access level",
      "FORBIDDEN_USER_LIST"
    );
  }
}

function inState(stateId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { stateId },
      { district: { stateId } },
      { trainingCenter: { district: { stateId } } },
    ],
  };
}

function inDistrict(districtId: string): Prisma.UserWhereInput {
  return {
    OR: [{ districtId }, { trainingCenter: { districtId } }],
  };
}

/**
 * Geographic / hierarchy constraint for the listing (excluding `role` and status).
 * National admin returns an empty filter (no extra constraint).
 */
export function hierarchyGeoWhere(actor: DbUser, targetRole: Role): Prisma.UserWhereInput {
  assertCanListUserType(actor.role, targetRole);

  switch (actor.role) {
    case "NATIONAL_ADMIN":
      return {};
    case "STATE_ADMIN": {
      const s = actor.stateId;
      if (!s) {
        throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
      }
      return inState(s);
    }
    case "DISTRICT_ADMIN": {
      const d = actor.districtId;
      if (!d) {
        throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
      }
      if (targetRole === "VOLUNTEER") {
        const stateId = actor.district?.state.id;
        if (!stateId) {
          throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
        }
        return { stateId };
      }
      return inDistrict(d);
    }
    case "TRAINING_CENTER": {
      const t = actor.trainingCenterId;
      if (!t) {
        throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
      }
      return { trainingCenterId: t };
    }
    default:
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }
}
