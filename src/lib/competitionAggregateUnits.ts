import type { CompetitionLevel } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import type { CompetitionGeography } from "./eligibility.js";
import { playerMatchesCompetitionGeography } from "./eligibility.js";

export const AGGREGATE_UNIT_TYPE = {
  TRAINING_CENTER: "TRAINING_CENTER",
  DISTRICT: "DISTRICT",
  STATE: "STATE",
} as const;

export type AggregateUnitType = (typeof AGGREGATE_UNIT_TYPE)[keyof typeof AGGREGATE_UNIT_TYPE];

/** Which geographic unit is ranked 1st–3rd for this competition level. */
export function aggregateUnitTypeForLevel(level: CompetitionLevel): AggregateUnitType {
  if (level === "DISTRICT") return AGGREGATE_UNIT_TYPE.TRAINING_CENTER;
  if (level === "STATE") return AGGREGATE_UNIT_TYPE.DISTRICT;
  return AGGREGATE_UNIT_TYPE.STATE;
}

type CompGeo = CompetitionGeography;

export async function assertAggregateUnitsInCompetitionScope(
  comp: CompGeo,
  unitType: AggregateUnitType,
  unitIds: string[]
): Promise<void> {
  const unique = [...new Set(unitIds)];
  if (unique.length !== unitIds.length) {
    throw new AppError(400, "Duplicate unit ids", "DUPLICATE_UNITS");
  }
  if (unitType === AGGREGATE_UNIT_TYPE.TRAINING_CENTER) {
    const tcs = await prisma.trainingCenter.findMany({
      where: { id: { in: unique } },
      include: { district: { select: { id: true, stateId: true } } },
    });
    if (tcs.length !== unique.length) {
      throw new AppError(400, "Unknown training center id", "UNKNOWN_UNIT");
    }
    for (const tc of tcs) {
      if (
        !playerMatchesCompetitionGeography(comp, {
          stateId: tc.district.stateId,
          districtId: tc.district.id,
        })
      ) {
        throw new AppError(
          400,
          "Training center is outside this competition's geography",
          "COMPETITION_GEO_MISMATCH"
        );
      }
    }
    return;
  }
  if (unitType === AGGREGATE_UNIT_TYPE.DISTRICT) {
    const ds = await prisma.district.findMany({
      where: { id: { in: unique } },
      select: { id: true, stateId: true },
    });
    if (ds.length !== unique.length) {
      throw new AppError(400, "Unknown district id", "UNKNOWN_UNIT");
    }
    for (const d of ds) {
      if (
        !playerMatchesCompetitionGeography(comp, {
          stateId: d.stateId,
          districtId: d.id,
        })
      ) {
        throw new AppError(
          400,
          "District is outside this competition's geography",
          "COMPETITION_GEO_MISMATCH"
        );
      }
    }
    return;
  }
  const states = await prisma.state.findMany({
    where: { id: { in: unique } },
    select: { id: true, isEnabled: true },
  });
  if (states.length !== unique.length) {
    throw new AppError(400, "Unknown state id", "UNKNOWN_UNIT");
  }
  for (const s of states) {
    if (!s.isEnabled) {
      throw new AppError(400, "State is not enabled", "STATE_DISABLED");
    }
  }
  let allowedStateIds: Set<string> | null = null;
  if (comp.states.length > 0) {
    allowedStateIds = new Set(comp.states.map((x) => x.stateId));
  } else if (comp.districts.length > 0) {
    const drows = await prisma.district.findMany({
      where: { id: { in: comp.districts.map((d) => d.districtId) } },
      select: { stateId: true },
    });
    allowedStateIds = new Set(drows.map((d) => d.stateId));
  }
  if (allowedStateIds) {
    for (const id of unique) {
      if (!allowedStateIds.has(id)) {
        throw new AppError(
          400,
          "State is outside this competition's geography",
          "COMPETITION_GEO_MISMATCH"
        );
      }
    }
  }
}
