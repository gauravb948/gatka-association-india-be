import type { AgeBandType, CompetitionLevel, Gender } from "@prisma/client";

const JUNIOR_BANDS = new Set<AgeBandType>(["SUB_JUNIOR", "JUNIOR"]);
const SENIOR_BANDS = new Set<AgeBandType>(["SENIOR", "VETERAN", "OPEN"]);

export type RegistrationGenderBucket = "men" | "women" | "boys" | "girls";

export function isMaleGender(gender: Gender): boolean {
  return gender === "MALE" || gender === "BOYS";
}

export function isFemaleGender(gender: Gender): boolean {
  return gender === "FEMALE" || gender === "GIRLS";
}

export function genderBucketForRegistration(
  bandType: AgeBandType | null | undefined,
  gender: Gender
): RegistrationGenderBucket | null {
  if (!bandType) return null;
  if (JUNIOR_BANDS.has(bandType)) {
    if (isMaleGender(gender)) return "boys";
    if (isFemaleGender(gender)) return "girls";
    return null;
  }
  if (SENIOR_BANDS.has(bandType)) {
    if (isMaleGender(gender)) return "men";
    if (isFemaleGender(gender)) return "women";
    return null;
  }
  return null;
}

export type CompetitionRegistrationStatRow = {
  competitionId: string;
  competition: string;
  /** State name(s) for STATE comps, district name(s) for DISTRICT comps, "National" for NATIONAL. */
  region: string;
  total: number;
  men: number;
  women: number;
  boys: number;
  girls: number;
};

export type RegistrationStatSource = {
  competitionId: string;
  playerUserId: string;
  competition: {
    id: string;
    name: string;
    level: CompetitionLevel;
    createdAt: Date;
    states: Array<{ state: { name: string } }>;
    districts: Array<{ district: { name: string; state: { name: string } } }>;
  };
  event: {
    eventGroup: {
      ageCategory: { bandType: AgeBandType | null };
    };
  } | null;
  playerUser: {
    playerProfile: { gender: Gender } | null;
  };
};

function uniqueJoined(names: string[]): string {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(name);
  }
  return ordered.join(", ");
}

/** Common region label: district for DISTRICT, state for STATE, National for NATIONAL. */
export function regionLabelForCompetition(comp: RegistrationStatSource["competition"]): string {
  if (comp.level === "DISTRICT") {
    const districts = uniqueJoined(comp.districts.map((d) => d.district.name));
    return districts || "—";
  }
  if (comp.level === "STATE") {
    const fromStates = uniqueJoined(comp.states.map((s) => s.state.name));
    if (fromStates) return fromStates;
    const fromDistrictStates = uniqueJoined(comp.districts.map((d) => d.district.state.name));
    return fromDistrictStates || "—";
  }
  return "National";
}

export function buildCompetitionRegistrationStats(
  rows: RegistrationStatSource[]
): CompetitionRegistrationStatRow[] {
  const byCompetition = new Map<
    string,
    {
      competition: string;
      region: string;
      createdAt: Date;
      total: Set<string>;
      men: Set<string>;
      women: Set<string>;
      boys: Set<string>;
      girls: Set<string>;
    }
  >();

  for (const row of rows) {
    const gender = row.playerUser.playerProfile?.gender;
    if (!gender || !row.event) continue;

    const bucket = genderBucketForRegistration(
      row.event.eventGroup.ageCategory.bandType,
      gender
    );
    if (!bucket) continue;

    let group = byCompetition.get(row.competitionId);
    if (!group) {
      group = {
        competition: row.competition.name,
        region: regionLabelForCompetition(row.competition),
        createdAt: row.competition.createdAt,
        total: new Set(),
        men: new Set(),
        women: new Set(),
        boys: new Set(),
        girls: new Set(),
      };
      byCompetition.set(row.competitionId, group);
    }

    group.total.add(row.playerUserId);
    group[bucket].add(row.playerUserId);
  }

  return [...byCompetition.entries()]
    .map(([competitionId, g]) => ({
      competitionId,
      competition: g.competition,
      region: g.region,
      total: g.total.size,
      men: g.men.size,
      women: g.women.size,
      boys: g.boys.size,
      girls: g.girls.size,
      _createdAt: g.createdAt,
    }))
    .sort((a, b) => b._createdAt.getTime() - a._createdAt.getTime())
    .map(({ _createdAt: _, ...row }) => row);
}
