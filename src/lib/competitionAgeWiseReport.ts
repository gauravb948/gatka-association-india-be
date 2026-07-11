import type { CompetitionLevel, Gender, Prisma } from "@prisma/client";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";

export const AGE_WISE_REPORT_COLUMNS = [
  "district",
  "teamDemo",
  "teamFariSoti",
  "teamSingleSoti",
  "indvDemo",
  "indvFariSoti",
  "indvSingleSoti",
] as const;

export type AgeWiseReportColumn = (typeof AGE_WISE_REPORT_COLUMNS)[number];

export type AgeWiseReportRow = Record<AgeWiseReportColumn, number>;

/** Outer key is training center, district, or state name (by competition level). Inner key is age group label. */
export type CompetitionAgeWiseReport = Record<string, Record<string, AgeWiseReportRow>>;

const EVENT_COLUMNS: AgeWiseReportColumn[] = AGE_WISE_REPORT_COLUMNS.filter(
  (c) => c !== "district"
);

type AgeGroupBucket = {
  sortOrder: number;
  district: Set<string>;
  columns: Map<AgeWiseReportColumn, Set<string>>;
};

type PlayerGeoProfile = {
  trainingCenter: { name: string } | null;
  district: { name: string } | null;
  state: { name: string } | null;
};

export function ageGroupLabel(ageCategory: { name: string; ageTo: number | null }): string {
  if (ageCategory.ageTo != null) return `U${ageCategory.ageTo + 1}`;
  return ageCategory.name;
}

export function eventNameToAgeWiseColumn(eventName: string): AgeWiseReportColumn | null {
  const name = eventName.trim();
  if (/^Team\s+Demo$/i.test(name)) return "teamDemo";
  if (/^Team\s+Fari\s+Soti$/i.test(name)) return "teamFariSoti";
  if (/^Team\s+Single\s+Soti$/i.test(name)) return "teamSingleSoti";
  if (/^Individual\s+Demo$/i.test(name)) return "indvDemo";
  if (/^Individual\s+Fari\s+Soti$/i.test(name)) return "indvFariSoti";
  if (/^Individual\s+Single\s+Soti$/i.test(name)) return "indvSingleSoti";
  return null;
}

function emptyRow(): AgeWiseReportRow {
  return {
    district: 0,
    teamDemo: 0,
    teamFariSoti: 0,
    teamSingleSoti: 0,
    indvDemo: 0,
    indvFariSoti: 0,
    indvSingleSoti: 0,
  };
}

function unitKeyForLevel(level: CompetitionLevel, profile: PlayerGeoProfile): string | null {
  if (level === "DISTRICT") return profile.trainingCenter?.name ?? null;
  if (level === "STATE") return profile.district?.name ?? null;
  if (level === "NATIONAL") return profile.state?.name ?? null;
  return null;
}

function createAgeGroupBuckets(
  ageCategories: Map<string, { label: string; sortOrder: number }>
): Map<string, AgeGroupBucket> {
  const buckets = new Map<string, AgeGroupBucket>();
  for (const { label, sortOrder } of ageCategories.values()) {
    buckets.set(label, {
      sortOrder,
      district: new Set(),
      columns: new Map(EVENT_COLUMNS.map((column) => [column, new Set()])),
    });
  }
  return buckets;
}

function bucketsToAgeGroupRows(
  buckets: Map<string, AgeGroupBucket>
): Record<string, AgeWiseReportRow> {
  const orderedLabels = [...buckets.entries()]
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([label]) => label);

  const result: Record<string, AgeWiseReportRow> = {};
  for (const label of orderedLabels) {
    const entry = buckets.get(label)!;
    const row = emptyRow();
    row.district = entry.district.size;
    for (const column of EVENT_COLUMNS) {
      row[column] = entry.columns.get(column)?.size ?? 0;
    }
    result[label] = row;
  }
  return result;
}

export async function buildCompetitionAgeWiseReport(
  competitionId: string,
  competitionLevel: CompetitionLevel,
  gender: Gender,
  playerProfileWhere: Prisma.PlayerProfileWhereInput
): Promise<CompetitionAgeWiseReport> {
  const groups = await competitionRepository.findEventGroupsInCompetitionAgeScope(competitionId);
  if (!groups) return {};

  const filteredGroups = groups.filter((g) => g.gender === gender);
  if (filteredGroups.length === 0) return {};

  const ageCategories = new Map<string, { label: string; sortOrder: number; ageCategoryId: string }>();
  for (const group of filteredGroups) {
    const ac = group.ageCategory;
    if (!ageCategories.has(ac.id)) {
      ageCategories.set(ac.id, {
        label: ageGroupLabel(ac),
        sortOrder: ac.sortOrder,
        ageCategoryId: ac.id,
      });
    }
  }

  const rows = await participationRepository.findParticipationsForAgeWiseReport(
    competitionId,
    gender,
    [...ageCategories.keys()],
    playerProfileWhere
  );

  const byUnit = new Map<string, Map<string, AgeGroupBucket>>();

  for (const row of rows) {
    const profile = row.playerUser.playerProfile;
    const ageCategory = row.event?.eventGroup?.ageCategory;
    const eventName = row.event?.name;
    if (!profile || !ageCategory || !eventName) continue;

    const unitName = unitKeyForLevel(competitionLevel, profile);
    if (!unitName) continue;

    let unitBuckets = byUnit.get(unitName);
    if (!unitBuckets) {
      unitBuckets = createAgeGroupBuckets(ageCategories);
      byUnit.set(unitName, unitBuckets);
    }

    const label = ageGroupLabel(ageCategory);
    const entry = unitBuckets.get(label);
    if (!entry) continue;

    entry.district.add(row.playerUserId);
    const column = eventNameToAgeWiseColumn(eventName);
    if (column) {
      entry.columns.get(column)?.add(row.playerUserId);
    }
  }

  const result: CompetitionAgeWiseReport = {};
  for (const unitName of [...byUnit.keys()].sort((a, b) => a.localeCompare(b))) {
    result[unitName] = bucketsToAgeGroupRows(byUnit.get(unitName)!);
  }

  return result;
}
