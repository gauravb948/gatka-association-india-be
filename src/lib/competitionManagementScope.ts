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
 * Clear participants: same-level admin (within geography) may remove everyone.
 * The role one step below the competition may remove only their territory
 * (training center → district, district admin → state, state admin → national).
 */
export async function assertCanClearCompetitionParticipants(
  user: DbUser,
  comp: CompetitionGeo
): Promise<"all" | "territory"> {
  const adminLevel = ADMIN_LEVEL[user.role];
  if (adminLevel === undefined) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }

  const compLevel = COMPETITION_LEVEL_RANK[comp.level];

  if (adminLevel === compLevel) {
    await assertCompetitionWithinActorGeography(user, comp);
    return "all";
  }

  if (adminLevel === compLevel - 1) {
    await assertCompetitionOverlapsActorGeography(user, comp);
    return "territory";
  }

  throw new AppError(
    403,
    "You may only clear participants on a competition at your level, or one level above",
    "FORBIDDEN_SCOPE"
  );
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
 * View participants: same-level admin (own unit), upper admins overseeing lower comps
 * in their geography, and lower-hierarchy users viewing higher-level comps they overlap
 * (e.g. a Ludhiana TC viewing Punjab/national — participants are filtered to that TC).
 */
export async function assertCanViewCompetitionParticipants(user: DbUser, comp: CompetitionGeo) {
  const adminLevel = ADMIN_LEVEL[user.role];
  if (adminLevel === undefined) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }

  const compLevel = COMPETITION_LEVEL_RANK[comp.level];
  if (adminLevel === compLevel) {
    await assertCompetitionWithinActorGeography(user, comp);
    return;
  }

  await assertCompetitionOverlapsActorGeography(user, comp);
}

/**
 * Competition is in-scope for the actor if their unit overlaps the competition geography
 * (competition may be wider than the actor — used for lower-hierarchy report viewing).
 */
async function assertCompetitionOverlapsActorGeography(user: DbUser, comp: CompetitionGeo) {
  if (user.role === "NATIONAL_ADMIN") return;

  const unrestricted = comp.states.length === 0 && comp.districts.length === 0;

  if (user.role === "STATE_ADMIN") {
    if (!user.stateId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (unrestricted) return;
    if (comp.states.some((s) => s.stateId === user.stateId)) return;
    if (comp.districts.length > 0) {
      const inState = await prisma.district.count({
        where: {
          id: { in: comp.districts.map((d) => d.districtId) },
          stateId: user.stateId,
        },
      });
      if (inState > 0) return;
    }
    throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
  }

  if (user.role === "DISTRICT_ADMIN") {
    if (!user.districtId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (unrestricted) return;
    if (comp.districts.some((d) => d.districtId === user.districtId)) return;
    if (user.stateId && comp.states.some((s) => s.stateId === user.stateId)) return;
    throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
  }

  if (user.role === "TRAINING_CENTER") {
    const districtId = user.trainingCenter?.district.id ?? user.districtId;
    const stateId = user.trainingCenter?.district.state.id ?? user.stateId;
    if (!districtId) throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
    if (unrestricted) return;
    if (comp.districts.some((d) => d.districtId === districtId)) return;
    if (stateId && comp.states.some((s) => s.stateId === stateId)) return;
    throw new AppError(403, "Forbidden", "FORBIDDEN_SCOPE");
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

/**
 * Scoped competition reports: same/upper hierarchy keeps full-containment geography checks;
 * lower hierarchy may still view the competition and receive only their own scope's records
 * (caller must filter players by actor geography).
 */
export async function assertCanViewCompetitionScopedReport(
  user: DbUser,
  comp: CompetitionGeo
) {
  if (user.role === "TRAINING_CENTER") {
    await assertCompetitionOverlapsActorGeography(user, comp);
    return;
  }

  const adminLevel = ADMIN_LEVEL[user.role];
  if (adminLevel === undefined) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }

  const compLevel = COMPETITION_LEVEL_RANK[comp.level];
  if (adminLevel < compLevel) {
    await assertCompetitionOverlapsActorGeography(user, comp);
    return;
  }

  await assertCompetitionWithinActorGeography(user, comp);
}
