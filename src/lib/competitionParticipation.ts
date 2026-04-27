import type { CompetitionLevel, Gender, Prisma } from "@prisma/client";
import type { CompetitionGeography } from "./eligibility.js";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";

/** Prisma filter for profile.gender from competition `genders` (OPEN = no constraint). */
export function playerProfileGenderWhereFromComp(
  compGenders: Gender[]
): Prisma.PlayerProfileWhereInput | undefined {
  if (compGenders.includes("OPEN")) return undefined;
  const set = new Set<Gender>();
  for (const g of compGenders) {
    if (g === "MALE" || g === "BOYS") {
      set.add("MALE");
      set.add("BOYS");
    }
    if (g === "FEMALE" || g === "GIRLS") {
      set.add("FEMALE");
      set.add("GIRLS");
    }
  }
  if (set.size === 0) return { userId: { in: [] } };
  return { gender: { in: [...set] } };
}

export function playerProfileWhereCompetitionEnabledScope(
  comp: CompetitionGeography
): Prisma.PlayerProfileWhereInput {
  const districtIds = comp.districts.map((d) => d.districtId);
  const stateIds = comp.states.map((s) => s.stateId);
  if (districtIds.length > 0) {
    return {
      districtId: { in: districtIds },
      district: { isEnabled: true, state: { isEnabled: true } },
    };
  }
  if (stateIds.length > 0) {
    return {
      stateId: { in: stateIds },
      state: { isEnabled: true },
      district: { isEnabled: true },
    };
  }
  return {
    state: { isEnabled: true },
    district: { isEnabled: true },
  };
}

type ActorPlayerScopeOpts = {
  /**
   * For `TRAINING_CENTER`, district-level competitions list every active player in the training
   * center's district (not only that TC). Other levels still use the training center id.
   */
  competitionLevel?: CompetitionLevel;
};

/** Geographic scope of players a registrar may list or sign up for participation. */
export function actorPlayerProfileScopeWhere(
  actor: DbUser,
  opts?: ActorPlayerScopeOpts
): Prisma.PlayerProfileWhereInput {
  if (actor.role === "NATIONAL_ADMIN") return {};
  if (actor.role === "STATE_ADMIN") {
    if (!actor.stateId) {
      throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
    }
    return { stateId: actor.stateId };
  }
  if (actor.role === "DISTRICT_ADMIN") {
    if (!actor.districtId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    return { districtId: actor.districtId };
  }
  if (actor.role === "TRAINING_CENTER") {
    if (!actor.trainingCenterId) {
      throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
    }
    if (opts?.competitionLevel === "DISTRICT") {
      if (!actor.trainingCenter) {
        throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
      }
      return { districtId: actor.trainingCenter.district.id };
    }
    return { trainingCenterId: actor.trainingCenterId };
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

/**
 * Who may record participation: one level below the competition —
 * national → state admin, state → district admin, district → training center.
 * National admin may always record.
 */
export function assertRegistrarCanRecordParticipation(
  actor: DbUser,
  comp: { level: CompetitionLevel },
  profile: { stateId: string; districtId: string; trainingCenterId: string }
) {
  if (actor.role === "NATIONAL_ADMIN") return;
  if (actor.role === "TRAINING_CENTER") {
    if (comp.level !== "DISTRICT") {
      throw new AppError(
        403,
        "Training centers may only sign players up for district-level competitions",
        "FORBIDDEN_LEVEL"
      );
    }
    if (!actor.trainingCenterId || !actor.trainingCenter) {
      throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
    }
    if (profile.districtId !== actor.trainingCenter.district.id) {
      throw new AppError(403, "Player not in your district", "FORBIDDEN_SCOPE");
    }
    return;
  }
  if (actor.role === "DISTRICT_ADMIN") {
    if (profile.districtId !== actor.districtId) {
      throw new AppError(403, "Player not in your district", "FORBIDDEN_SCOPE");
    }
    if (comp.level !== "STATE") {
      throw new AppError(
        403,
        "District admins may only sign players up for state-level competitions",
        "FORBIDDEN_LEVEL"
      );
    }
    return;
  }
  if (actor.role === "STATE_ADMIN") {
    if (profile.stateId !== actor.stateId) {
      throw new AppError(403, "Player not in your state", "FORBIDDEN_SCOPE");
    }
    if (comp.level !== "NATIONAL") {
      throw new AppError(
        403,
        "State admins may only sign players up for national-level competitions",
        "FORBIDDEN_LEVEL"
      );
    }
    return;
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}
