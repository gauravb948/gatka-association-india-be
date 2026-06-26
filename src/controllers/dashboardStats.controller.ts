import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as dashboardStatsRepository from "../repositories/dashboardStats.repository.js";
import { AppError } from "../lib/errors.js";
import type { DbUser } from "../types/user.js";

async function effectiveStateAdminStateId(actor: DbUser): Promise<string | null> {
  if (actor.role !== "STATE_ADMIN") return null;
  if (actor.stateId) return actor.stateId;
  const reg = await stateRegistrationRepo.findStateIdByApplicantUserId(actor.id);
  return reg?.stateId ?? null;
}

function buildCompetitionListUser(actor: DbUser, stateAdminEffectiveStateId: string | null) {
  if (actor.role === "TRAINING_CENTER") {
    return {
      id: actor.id,
      role: actor.role,
      stateId: actor.stateId ?? actor.trainingCenter?.district.state.id ?? null,
      districtId: actor.districtId ?? actor.trainingCenter?.district.id ?? null,
    };
  }
  if (actor.role === "STATE_ADMIN") {
    return {
      id: actor.id,
      role: actor.role,
      stateId: stateAdminEffectiveStateId ?? actor.stateId,
      districtId: actor.districtId,
    };
  }
  return {
    id: actor.id,
    role: actor.role,
    stateId: actor.stateId,
    districtId: actor.districtId,
  };
}

async function resolveDashboardScope(actor: DbUser): Promise<{
  scope: dashboardStatsRepository.DashboardGeoScope;
  competitionUser: {
    id: string;
    role: Role;
    stateId: string | null;
    districtId: string | null;
  };
}> {
  if (actor.role === "NATIONAL_ADMIN") {
    return {
      scope: { kind: "national" },
      competitionUser: buildCompetitionListUser(actor, null),
    };
  }

  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    return {
      scope: { kind: "state", stateId: sid },
      competitionUser: buildCompetitionListUser(actor, sid),
    };
  }

  if (actor.role === "DISTRICT_ADMIN") {
    if (!actor.districtId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    return {
      scope: { kind: "district", districtId: actor.districtId },
      competitionUser: buildCompetitionListUser(actor, null),
    };
  }

  if (actor.role === "TRAINING_CENTER") {
    if (!actor.trainingCenterId) {
      throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
    }
    const districtId = actor.districtId ?? actor.trainingCenter?.district.id;
    if (!districtId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    return {
      scope: { kind: "training_center", trainingCenterId: actor.trainingCenterId, districtId },
      competitionUser: buildCompetitionListUser(actor, null),
    };
  }

  throw new AppError(403, "Dashboard is not available for this role", "FORBIDDEN_ROLE");
}

/** `GET /dashboard/stats` — hierarchy-scoped counts for admin home. */
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const { scope, competitionUser } = await resolveDashboardScope(actor);
    const stats = await dashboardStatsRepository.getDashboardCounts({
      scope,
      competitionUser,
    });
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

/** `GET /dashboard/overview` — hierarchy-scoped summary cards for admin home. */
export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const { scope } = await resolveDashboardScope(actor);
    const overview = await dashboardStatsRepository.getDashboardOverviewCounts(scope);
    res.json(overview);
  } catch (e) {
    next(e);
  }
}
