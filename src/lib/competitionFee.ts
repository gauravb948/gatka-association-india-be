import type { CompetitionFeeUnitType, CompetitionLevel } from "@prisma/client";
import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";
import type { DbUser } from "../types/user.js";

export type CompetitionFeeUnit = {
  unitType: CompetitionFeeUnitType;
  unitId: string;
};

export function isCompetitionOrganizer(
  actor: DbUser,
  level: CompetitionLevel
): boolean {
  if (actor.role === "NATIONAL_ADMIN" && level === "NATIONAL") return true;
  if (actor.role === "STATE_ADMIN" && level === "STATE") return true;
  return false;
}

/** District pays for a state competition; state pays for a national competition. */
export function payingUnitForActor(
  actor: DbUser,
  level: CompetitionLevel
): CompetitionFeeUnit | null {
  if (level === "STATE" && actor.role === "DISTRICT_ADMIN") {
    if (!actor.districtId) {
      throw new AppError(403, "District context missing", "FORBIDDEN_SCOPE");
    }
    return { unitType: "DISTRICT", unitId: actor.districtId };
  }
  if (level === "NATIONAL" && actor.role === "STATE_ADMIN") {
    if (!actor.stateId) {
      throw new AppError(403, "State context missing", "FORBIDDEN_SCOPE");
    }
    return { unitType: "STATE", unitId: actor.stateId };
  }
  return null;
}

export function assertEntryFeeForLevel(
  level: CompetitionLevel,
  entryFeePaise: number | null | undefined
): number | null {
  if (level === "DISTRICT") {
    if (entryFeePaise != null) {
      throw new AppError(
        400,
        "District competitions do not have an entry fee",
        "FEE_NOT_ALLOWED"
      );
    }
    return null;
  }
  if (entryFeePaise == null || !Number.isInteger(entryFeePaise) || entryFeePaise < 0) {
    throw new AppError(
      400,
      "State and national competitions require an entry fee (rupees, including 0)",
      "FEE_REQUIRED"
    );
  }
  return entryFeePaise;
}

export async function countUniquePlayersForUnit(
  competitionId: string,
  unit: CompetitionFeeUnit
): Promise<number> {
  const profileWhere =
    unit.unitType === "DISTRICT" ? { districtId: unit.unitId } : { stateId: unit.unitId };
  const rows = await prisma.participationRecord.findMany({
    where: {
      competitionId,
      participated: true,
      playerUser: { playerProfile: profileWhere },
    },
    distinct: ["playerUserId"],
    select: { playerUserId: true },
  });
  return rows.length;
}

export function findFeeSubmission(competitionId: string, unit: CompetitionFeeUnit) {
  return prisma.competitionFeeSubmission.findUnique({
    where: {
      competitionId_unitType_unitId: {
        competitionId,
        unitType: unit.unitType,
        unitId: unit.unitId,
      },
    },
  });
}

export async function countFeeSubmissions(competitionId: string): Promise<number> {
  return prisma.competitionFeeSubmission.count({ where: { competitionId } });
}

/** Paying unit cannot change its roster after final submission. Organizers are never locked. */
export async function assertPayingUnitRosterUnlocked(
  actor: DbUser,
  competitionId: string,
  level: CompetitionLevel
): Promise<void> {
  if (isCompetitionOrganizer(actor, level)) return;
  const unit = payingUnitForActor(actor, level);
  if (!unit) return;
  const existing = await findFeeSubmission(competitionId, unit);
  if (existing) {
    throw new AppError(
      403,
      "Roster is locked after final submission. Contact the competition organizer to make changes.",
      "ROSTER_LOCKED"
    );
  }
}

export type CompetitionFeeMetadata = {
  competitionId?: string;
  unitType?: string;
  unitId?: string;
  competitionLevel?: string;
  playerCount?: number;
};

export function parseCompetitionFeeMetadata(metadata: unknown): CompetitionFeeMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const m = metadata as Record<string, unknown>;
  return {
    competitionId: typeof m.competitionId === "string" ? m.competitionId : undefined,
    unitType: typeof m.unitType === "string" ? m.unitType : undefined,
    unitId: typeof m.unitId === "string" ? m.unitId : undefined,
    competitionLevel: typeof m.competitionLevel === "string" ? m.competitionLevel : undefined,
    playerCount: typeof m.playerCount === "number" ? m.playerCount : undefined,
  };
}

export async function upsertCompetitionFeeSubmissionFromPayment(pay: {
  id: string;
  amountPaise: number;
  metadata: unknown;
}): Promise<void> {
  const meta = parseCompetitionFeeMetadata(pay.metadata);
  if (!meta.competitionId || !meta.unitType || !meta.unitId) return;
  if (meta.unitType !== "DISTRICT" && meta.unitType !== "STATE") return;

  const playerCount =
    typeof meta.playerCount === "number" && Number.isInteger(meta.playerCount) && meta.playerCount > 0
      ? meta.playerCount
      : await countUniquePlayersForUnit(meta.competitionId, {
          unitType: meta.unitType,
          unitId: meta.unitId,
        });

  await prisma.competitionFeeSubmission.upsert({
    where: {
      competitionId_unitType_unitId: {
        competitionId: meta.competitionId,
        unitType: meta.unitType,
        unitId: meta.unitId,
      },
    },
    create: {
      competitionId: meta.competitionId,
      unitType: meta.unitType,
      unitId: meta.unitId,
      playerCount,
      amountPaise: pay.amountPaise,
      paymentId: pay.id,
    },
    update: {
      paymentId: pay.id,
    },
  });
}
