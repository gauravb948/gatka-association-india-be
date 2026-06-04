import type { CompetitionLevel, Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";

type CompetitionGeo = {
  level: CompetitionLevel;
  states: { stateId: string }[];
  districts: { districtId: string }[];
};

const ADMIN_LEVEL: Partial<Record<Role, number>> = {
  NATIONAL_ADMIN: 3,
  STATE_ADMIN: 2,
  DISTRICT_ADMIN: 1,
  TRAINING_CENTER: 0,
};

const COMPETITION_LEVEL_RANK: Record<CompetitionLevel, number> = {
  NATIONAL: 3,
  STATE: 2,
  DISTRICT: 1,
};

const MANAGE_ROLE_FOR_LEVEL: Record<CompetitionLevel, Role> = {
  NATIONAL: "NATIONAL_ADMIN",
  STATE: "STATE_ADMIN",
  DISTRICT: "DISTRICT_ADMIN",
};

async function assertCompetitionWithinActorGeography(user: DbUser, comp: CompetitionGeo) {
  if (user.role === "NATIONAL_ADMIN") return;

  if (user.role === "STATE_ADMIN") {
    if (!user.stateId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (comp.states.length > 0) {
      if (comp.states.some((s) => s.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
      }
      return;
    }
    if (comp.districts.length > 0) {
      const rows = await prisma.district.findMany({
        where: { id: { in: comp.districts.map((d) => d.districtId) } },
        select: { stateId: true },
      });
      if (rows.some((r) => r.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
      }
      return;
    }
    return;
  }

  if (user.role === "DISTRICT_ADMIN") {
    if (!user.districtId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (comp.districts.length === 0) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    }
    if (comp.districts.some((d) => d.districtId !== user.districtId)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    }
    return;
  }

  if (user.role === "TRAINING_CENTER") {
    const districtId = user.trainingCenter?.district.id ?? user.districtId;
    if (!districtId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (comp.districts.length === 0) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    }
    if (!comp.districts.some((d) => d.districtId === districtId)) {
      throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    }
    return;
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

/**
 * Edit / delete / close: only the admin role that matches the competition level
 * (national → national admin, state → state admin, district → district admin),
 * within their geographic scope.
 */
export async function assertCanManageCompetition(user: DbUser, comp: CompetitionGeo) {
  const requiredRole = MANAGE_ROLE_FOR_LEVEL[comp.level];
  if (user.role !== requiredRole) {
    throw new AppError(
      403,
      `Only ${requiredRole.replace("_", " ").toLowerCase()}s may manage ${comp.level.toLowerCase()}-level competitions`,
      "FORBIDDEN_SCOPE"
    );
  }
  await assertCompetitionWithinActorGeography(user, comp);
}

/**
 * View participants: same-level admin and all upper hierarchy admins in scope.
 * Training centers may view district-level competitions in their district.
 */
export async function assertCanViewCompetitionParticipants(user: DbUser, comp: CompetitionGeo) {
  if (user.role === "TRAINING_CENTER") {
    if (comp.level !== "DISTRICT") {
      throw new AppError(
        403,
        "Training centers may only view participants for district-level competitions",
        "FORBIDDEN_SCOPE"
      );
    }
    await assertCompetitionWithinActorGeography(user, comp);
    return;
  }

  const adminLevel = ADMIN_LEVEL[user.role];
  if (adminLevel === undefined) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }

  const compLevel = COMPETITION_LEVEL_RANK[comp.level];
  if (adminLevel < compLevel) {
    throw new AppError(
      403,
      "You cannot view participants for this competition at your access level",
      "FORBIDDEN_SCOPE"
    );
  }

  await assertCompetitionWithinActorGeography(user, comp);
}
