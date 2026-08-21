import type { CompetitionLevel, Prisma, Role } from "@prisma/client";
import { ageBandsOverlap } from "../lib/age.js";
import { prisma } from "../lib/prisma.js";

function withNameContains(
  where: Prisma.CompetitionWhereInput,
  nameContains?: string
): Prisma.CompetitionWhereInput {
  if (!nameContains) return where;
  const nameFilter = {
    name: { contains: nameContains, mode: "insensitive" as const },
  };
  if (Object.keys(where).length === 0) return nameFilter;
  return { AND: [where, nameFilter] };
}

/** Filter competitions whose `createdAt` falls in the UTC calendar year `sessionYear`. */
function withSessionYear(
  where: Prisma.CompetitionWhereInput,
  sessionYear?: number
): Prisma.CompetitionWhereInput {
  if (sessionYear == null || !Number.isFinite(sessionYear)) return where;
  const year = Math.trunc(sessionYear);
  const sessionFilter: Prisma.CompetitionWhereInput = {
    createdAt: {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    },
  };
  if (Object.keys(where).length === 0) return sessionFilter;
  return { AND: [where, sessionFilter] };
}

const emptyGeography: Prisma.CompetitionWhereInput = {
  AND: [{ states: { none: {} } }, { districts: { none: {} } }],
};

function orWhere(parts: Prisma.CompetitionWhereInput[]): Prisma.CompetitionWhereInput {
  if (parts.length === 0) return { id: { in: [] } };
  if (parts.length === 1) return parts[0]!;
  return { OR: parts };
}

function andLevel(
  level: CompetitionLevel,
  geo: Prisma.CompetitionWhereInput
): Prisma.CompetitionWhereInput {
  return { AND: [{ level }, geo] };
}

function combineLevelGeo(
  level: CompetitionLevel | undefined,
  byLevel: Record<CompetitionLevel, Prisma.CompetitionWhereInput>
): Prisma.CompetitionWhereInput {
  if (level) return byLevel[level];
  return {
    OR: [
      andLevel("DISTRICT", byLevel.DISTRICT),
      andLevel("STATE", byLevel.STATE),
      andLevel("NATIONAL", byLevel.NATIONAL),
    ],
  };
}

/**
 * List visibility by competition level so sibling units cannot see each other.
 * District tab — only this district (Ludhiana cannot see Sangrur).
 * State tab — state-level comps for this state (Punjab).
 * National tab — national comps that include this state, or unrestricted national.
 */
function hierarchyListVisibilityWhere(
  user: {
    role: Role;
    stateId: string | null;
    districtId: string | null;
  },
  level?: CompetitionLevel
): Prisma.CompetitionWhereInput | null {
  if (user.role === "STATE_ADMIN") {
    if (!user.stateId) return null;
    const inStateDistricts: Prisma.CompetitionWhereInput = {
      districts: { some: { district: { stateId: user.stateId } } },
    };
    const inState: Prisma.CompetitionWhereInput = {
      states: { some: { stateId: user.stateId } },
    };
    return combineLevelGeo(level, {
      DISTRICT: inStateDistricts,
      STATE: orWhere([inState, inStateDistricts]),
      NATIONAL: orWhere([emptyGeography, inState, inStateDistricts]),
    });
  }

  if (user.role === "DISTRICT_ADMIN" || user.role === "TRAINING_CENTER") {
    if (!user.districtId) return null;
    const ownDistrict: Prisma.CompetitionWhereInput = {
      districts: { some: { districtId: user.districtId } },
    };
    const ownState: Prisma.CompetitionWhereInput[] = [ownDistrict];
    if (user.stateId) ownState.unshift({ states: { some: { stateId: user.stateId } } });
    return combineLevelGeo(level, {
      DISTRICT: ownDistrict,
      STATE: orWhere(ownState),
      NATIONAL: orWhere([emptyGeography, ...ownState]),
    });
  }

  return {};
}

function withLevel(
  where: Prisma.CompetitionWhereInput,
  level?: CompetitionLevel
): Prisma.CompetitionWhereInput {
  if (!level) return where;
  const levelFilter: Prisma.CompetitionWhereInput = { level };
  if (Object.keys(where).length === 0) return levelFilter;
  return { AND: [where, levelFilter] };
}

function withListFilters(
  where: Prisma.CompetitionWhereInput,
  opts: {
    nameContains?: string;
    sessionYear?: number;
    level?: CompetitionLevel;
    openOnly?: boolean;
  }
): Prisma.CompetitionWhereInput {
  let next = withNameContains(where, opts.nameContains);
  next = withSessionYear(next, opts.sessionYear);
  next = withLevel(next, opts.level);
  if (opts.openOnly) {
    return Object.keys(next).length === 0 ? { isClosed: false } : { AND: [next, { isClosed: false }] };
  }
  return next;
}

/** Competitions whose results the caller may list (hierarchy-scoped). Returns null when not allowed. */
export function competitionResultsVisibilityWhere(user: {
  role: Role;
  stateId: string | null;
  districtId: string | null;
}): Prisma.CompetitionWhereInput | null {
  if (user.role === "NATIONAL_ADMIN") return {};

  if (user.role === "STATE_ADMIN") {
    if (!user.stateId) return null;
    return {
      level: { in: ["NATIONAL", "STATE", "DISTRICT"] },
      OR: [
        { states: { some: { stateId: user.stateId } } },
        { districts: { some: { district: { stateId: user.stateId } } } },
        { AND: [{ states: { none: {} } }, { districts: { none: {} } }] },
      ],
    };
  }

  if (user.role === "DISTRICT_ADMIN") {
    if (!user.districtId) return null;
    const or: Prisma.CompetitionWhereInput[] = [
      { districts: { some: { districtId: user.districtId } } },
    ];
    if (user.stateId) {
      or.push({
        AND: [{ districts: { none: {} } }, { states: { some: { stateId: user.stateId } } }],
      });
    }
    or.push({ AND: [{ states: { none: {} } }, { districts: { none: {} } }] });
    return {
      level: { in: ["STATE", "DISTRICT"] },
      OR: or,
    };
  }

  return null;
}

export function buildResultsListCompetitionFilter(
  user: { role: Role; stateId: string | null; districtId: string | null },
  opts?: { competitionId?: string; search?: string }
): Prisma.CompetitionWhereInput | null {
  const visibility = competitionResultsVisibilityWhere(user);
  if (visibility === null) return null;

  const parts: Prisma.CompetitionWhereInput[] = [visibility];
  if (opts?.competitionId) {
    parts.push({ id: opts.competitionId });
  }
  const base = parts.length === 1 ? parts[0]! : { AND: parts };
  return withNameContains(base, opts?.search);
}

const defaultCompetitionInclude = {
  states: true,
  districts: true,
  ageCategories: { include: { ageCategory: true } },
} as const;

/** States, districts, age categories, and creator (for admin create/update/read responses). */
const competitionWithCreatorInclude = {
  ...defaultCompetitionInclude,
  createdBy: {
    select: {
      id: true,
      email: true,
      role: true,
      stateId: true,
      districtId: true,
    },
  },
} satisfies Prisma.CompetitionInclude;

const meListInclude = competitionWithCreatorInclude;

/** Full catalog events (all apply to every competition; there is no Competition–Event join table). */
export const catalogEventWithGroupInclude = {
  eventGroup: { include: { ageCategory: true } },
} as const;

export type CatalogEventWithGroup = Prisma.EventGetPayload<{
  include: typeof catalogEventWithGroupInclude;
}>;

export function findAllActiveEventsWithGroup() {
  return prisma.event.findMany({
    where: { isActive: true },
    include: catalogEventWithGroupInclude,
    orderBy: [{ eventGroup: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
}

export type CompetitionParticipationContext = {
  comp: Prisma.CompetitionGetPayload<{ include: typeof defaultCompetitionInclude }>;
  catalogEvents: Awaited<ReturnType<typeof findAllActiveEventsWithGroup>>;
};

/** Competition row with age/geo + all active catalog events (same for every competition). */
export async function findByIdForParticipationContext(
  id: string
): Promise<CompetitionParticipationContext | null> {
  const [comp, catalogEvents] = await Promise.all([
    prisma.competition.findUnique({ where: { id }, include: defaultCompetitionInclude }),
    findAllActiveEventsWithGroup(),
  ]);
  if (!comp) return null;
  return { comp, catalogEvents };
}

/** Competitions created by this admin, by lower hierarchy (in subtree), or legacy rows with no creator. */
function adminCompetitionCreatorWhere(user: {
  id: string;
  role: Role;
  stateId: string | null;
  districtId: string | null;
}): Prisma.CompetitionWhereInput {
  if (user.role === "NATIONAL_ADMIN") {
    return {
      OR: [
        { createdById: user.id },
        { createdBy: { role: { in: ["STATE_ADMIN", "DISTRICT_ADMIN"] } } },
        { createdById: null },
      ],
    };
  }
  if (user.role === "STATE_ADMIN") {
    return {
      OR: [
        { createdById: user.id },
        { createdById: null },
        {
          createdBy: {
            role: "DISTRICT_ADMIN",
            district: { stateId: user.stateId! },
          },
        },
      ],
    };
  }
  if (user.role === "DISTRICT_ADMIN") {
    return {
      OR: [
        { createdById: user.id },
        { createdById: null },
        {
          createdBy: {
            role: "DISTRICT_ADMIN",
            districtId: user.districtId!,
          },
        },
      ],
    };
  }
  return {};
}

export function findMany(filters?: { nameContains?: string; level?: CompetitionLevel }) {
  const where = withLevel(withNameContains({}, filters?.nameContains), filters?.level);
  return prisma.competition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: defaultCompetitionInclude,
  });
}

async function findPaginatedForMe(where: Prisma.CompetitionWhereInput, skip: number, take: number) {
  const [total, items] = await Promise.all([
    prisma.competition.count({ where }),
    prisma.competition.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: meListInclude,
    }),
  ]);
  return { items, total };
}

/**
 * Authenticated competition list (optional `level` tab filter).
 * Geography is applied per level so sibling units cannot see each other
 * (Ludhiana district admin cannot list Sangrur district competitions).
 * National — comps you created, by lower admins, or legacy (no creator).
 * State — district comps in this state; state/national comps scoped to this state.
 * District / training center — own district comps; state/national comps for this state.
 * Player — competitions with a `participated` record.
 * Other roles — competitions with a tournament registration as the player.
 */
export async function findManyForAuthenticatedUserPaginated(
  user: {
    id: string;
    role: Role;
    stateId: string | null;
    districtId: string | null;
  },
  pagination: {
    skip: number;
    take: number;
    nameContains?: string;
    openOnly?: boolean;
    sessionYear?: number;
    level?: CompetitionLevel;
  }
) {
  const { skip, take, nameContains, openOnly, sessionYear, level } = pagination;
  const filters = { nameContains, sessionYear, level, openOnly };

  if (user.role === "NATIONAL_ADMIN") {
    return findPaginatedForMe(withListFilters(adminCompetitionCreatorWhere(user), filters), skip, take);
  }

  if (
    user.role === "STATE_ADMIN" ||
    user.role === "DISTRICT_ADMIN" ||
    user.role === "TRAINING_CENTER"
  ) {
    const vis = hierarchyListVisibilityWhere(user, level);
    if (!vis) return { items: [], total: 0 };
    return findPaginatedForMe(withListFilters(vis, filters), skip, take);
  }

  if (user.role === "PLAYER") {
    const grouped = await prisma.participationRecord.groupBy({
      by: ["competitionId"],
      where: { playerUserId: user.id, participated: true },
    });
    const idList = grouped.map((g) => g.competitionId);
    if (idList.length === 0) return { items: [], total: 0 };
    return findPaginatedForMe(withListFilters({ id: { in: idList } }, filters), skip, take);
  }

  const grouped = await prisma.tournamentRegistration.groupBy({
    by: ["competitionId"],
    where: { playerUserId: user.id },
  });
  const idList = grouped.map((g) => g.competitionId);
  if (idList.length === 0) return { items: [], total: 0 };
  return findPaginatedForMe(withListFilters({ id: { in: idList } }, filters), skip, take);
}

/**
 * Competitions for report/summary-sheet filter dropdowns.
 * Uses the older hierarchy visibility (state admins see NATIONAL + STATE only — not lower DISTRICT comps).
 * No session-year filter.
 */
export async function findManyForReportFiltersPaginated(
  user: {
    id: string;
    role: Role;
    stateId: string | null;
    districtId: string | null;
  },
  pagination: { skip: number; take: number; nameContains?: string }
) {
  const { skip, take, nameContains } = pagination;

  if (user.role === "NATIONAL_ADMIN") {
    const where = withNameContains(adminCompetitionCreatorWhere(user), nameContains);
    const [total, items] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: meListInclude,
      }),
    ]);
    return { items, total };
  }

  if (user.role === "STATE_ADMIN") {
    if (!user.stateId) return { items: [], total: 0 };
    const geo: Prisma.CompetitionWhereInput = {
      level: { in: ["NATIONAL", "STATE"] },
      OR: [
        { states: { some: { stateId: user.stateId } } },
        { districts: { some: { district: { stateId: user.stateId } } } },
        {
          AND: [{ states: { none: {} } }, { districts: { none: {} } }],
        },
      ],
    };
    const where = withNameContains(geo, nameContains);
    const [total, items] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: meListInclude,
      }),
    ]);
    return { items, total };
  }

  if (user.role === "DISTRICT_ADMIN") {
    if (!user.districtId) return { items: [], total: 0 };
    const or: Prisma.CompetitionWhereInput[] = [
      { districts: { some: { districtId: user.districtId } } },
    ];
    if (user.stateId) {
      or.push({
        AND: [
          { districts: { none: {} } },
          { states: { some: { stateId: user.stateId } } },
        ],
      });
    }
    or.push({
      AND: [{ states: { none: {} } }, { districts: { none: {} } }],
    });
    const geo: Prisma.CompetitionWhereInput = {
      level: { in: ["STATE", "DISTRICT"] },
      OR: or,
    };
    const where = withNameContains(geo, nameContains);
    const [total, items] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: meListInclude,
      }),
    ]);
    return { items, total };
  }

  if (user.role === "TRAINING_CENTER" && user.districtId) {
    const geo: Prisma.CompetitionWhereInput = {
      level: "DISTRICT",
      districts: { some: { districtId: user.districtId } },
    };
    const where = withNameContains(geo, nameContains);
    const [total, items] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: meListInclude,
      }),
    ]);
    return { items, total };
  }

  return { items: [], total: 0 };
}

/** Distinct UTC calendar years that have at least one competition (`createdAt`). Newest first. */
export async function findDistinctCompetitionSessionYears(): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ year: number | bigint }>>`
    SELECT DISTINCT EXTRACT(YEAR FROM ("createdAt" AT TIME ZONE 'UTC'))::int AS year
    FROM "Competition"
    ORDER BY year DESC
  `;
  return rows
    .map((r) => (typeof r.year === "bigint" ? Number(r.year) : r.year))
    .filter((y) => Number.isFinite(y));
}

/** Same visibility as `findManyForAuthenticatedUserPaginated`; returns total count only (for dashboard). */
export async function countCompetitionsForAuthenticatedUser(user: {
  id: string;
  role: Role;
  stateId: string | null;
  districtId: string | null;
}) {
  const { total } = await findManyForAuthenticatedUserPaginated(user, {
    skip: 0,
    take: 1,
    openOnly: true,
  });
  return total;
}

export function createCompetition(
  data: Prisma.CompetitionCreateInput,
  include?: Prisma.CompetitionInclude
) {
  return prisma.competition.create({
    data,
    include: include ?? competitionWithCreatorInclude,
  });
}

export function findByIdForPlayerEligibility(id: string) {
  return prisma.competition.findUnique({
    where: { id },
    include: defaultCompetitionInclude,
  });
}

/**
 * @deprecated use findByIdForParticipationContext
 */
export const findByIdWithEvents = findByIdForParticipationContext;

/** Full graph for public detail: geo, age, creator, plus all active catalog events. */
export async function findByIdDetail(id: string) {
  const [row, catalogEvents] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      include: {
        states: { include: { state: true } },
        districts: { include: { district: { include: { state: true } } } },
        ageCategories: { include: { ageCategory: true } },
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true,
            stateId: true,
            districtId: true,
          },
        },
      },
    }),
    findAllActiveEventsWithGroup(),
  ]);
  if (!row) return null;
  return { ...row, events: catalogEvents };
}

export function findFirstByName(name: string) {
  return prisma.competition.findFirst({ where: { name }, select: { id: true } });
}

export function findFirstByNameExcludingId(name: string, excludeId: string) {
  return prisma.competition.findFirst({
    where: { name, id: { not: excludeId } },
    select: { id: true },
  });
}

export type CompetitionGeoUpdate = { stateIds: string[]; districtIds: string[] };

export async function updateCompetitionAndGeo(
  id: string,
  data: Prisma.CompetitionUpdateInput,
  opts?: {
    geo?: CompetitionGeoUpdate;
    ageCategoryIds?: string[];
  }
) {
  return prisma.$transaction(async (tx) => {
    if (opts?.geo) {
      await tx.competitionState.deleteMany({ where: { competitionId: id } });
      await tx.competitionDistrict.deleteMany({ where: { competitionId: id } });
      if (opts.geo.stateIds.length > 0) {
        await tx.competitionState.createMany({
          data: opts.geo.stateIds.map((stateId) => ({ competitionId: id, stateId })),
        });
      }
      if (opts.geo.districtIds.length > 0) {
        await tx.competitionDistrict.createMany({
          data: opts.geo.districtIds.map((districtId) => ({ competitionId: id, districtId })),
        });
      }
    }
    if (opts?.ageCategoryIds !== undefined) {
      await tx.competitionAgeCategory.deleteMany({ where: { competitionId: id } });
      if (opts.ageCategoryIds.length > 0) {
        await tx.competitionAgeCategory.createMany({
          data: opts.ageCategoryIds.map((ageCategoryId) => ({
            competitionId: id,
            ageCategoryId,
          })),
        });
      }
    }
    const include = {
      ...competitionWithCreatorInclude,
    } satisfies Prisma.CompetitionInclude;
    if (Object.keys(data).length > 0) {
      return tx.competition.update({ where: { id }, data, include });
    }
    return tx.competition.findUniqueOrThrow({ where: { id }, include });
  });
}

export function findByIdBasic(id: string) {
  return prisma.competition.findUnique({ where: { id } });
}

type CompetitionParticipantDeleteCounts = {
  participations: number;
  tournamentRegistrations: number;
  attendance: number;
  results: number;
  aggregateStandings: number;
};

async function deleteCompetitionParticipantRows(
  tx: Prisma.TransactionClient,
  competitionId: string,
  playerProfileWhere?: Prisma.PlayerProfileWhereInput
): Promise<CompetitionParticipantDeleteCounts> {
  const scoped = playerProfileWhere && Object.keys(playerProfileWhere).length > 0;
  const playerUserFilter = scoped
    ? { playerUser: { playerProfile: playerProfileWhere } }
    : {};
  const attendanceUserFilter = scoped
    ? { user: { playerProfile: playerProfileWhere } }
    : {};

  const [participations, tournamentRegistrations, attendance, results, aggregateStandings] =
    await Promise.all([
      tx.participationRecord.deleteMany({
        where: { competitionId, ...playerUserFilter },
      }),
      tx.tournamentRegistration.deleteMany({
        where: { competitionId, ...playerUserFilter },
      }),
      tx.attendance.deleteMany({
        where: { competitionId, ...attendanceUserFilter },
      }),
      tx.competitionResult.deleteMany({
        where: { competitionId, ...playerUserFilter },
      }),
      scoped
        ? Promise.resolve({ count: 0 })
        : tx.competitionAggregateStanding.deleteMany({ where: { competitionId } }),
    ]);
  return {
    participations: participations.count,
    tournamentRegistrations: tournamentRegistrations.count,
    attendance: attendance.count,
    results: results.count,
    aggregateStandings: aggregateStandings.count,
  };
}

/** Remove participant-related rows; keeps the competition. Optional profile filter = one territory. */
export function deleteCompetitionParticipants(
  id: string,
  playerProfileWhere?: Prisma.PlayerProfileWhereInput
) {
  return prisma.$transaction((tx) =>
    deleteCompetitionParticipantRows(tx, id, playerProfileWhere)
  );
}

/** Hard-delete a competition and all participant-related rows in one transaction. */
export async function deleteCompetition(id: string) {
  return prisma.$transaction(async (tx) => {
    const counts = await deleteCompetitionParticipantRows(tx, id);
    await tx.competition.delete({ where: { id } });
    return counts;
  });
}

/**
 * Active event groups whose age band overlaps at least one of the competition’s linked `AgeCategory` rows
 * (inclusive ranges; null `ageFrom`/`ageTo` = unbounded). If the competition has no linked age categories,
 * returns all active event groups.
 */
export async function findEventGroupsInCompetitionAgeScope(
  competitionId: string
): Promise<Prisma.EventGroupGetPayload<{ include: { ageCategory: true } }>[] | null> {
  const comp = await findByIdForPlayerEligibility(competitionId);
  if (!comp) return null;
  const groups = await prisma.eventGroup.findMany({
    where: { isActive: true },
    include: { ageCategory: true },
    orderBy: { sortOrder: "asc" },
  });
  const compCats = comp.ageCategories.map((c) => c.ageCategory);
  if (compCats.length === 0) {
    return groups;
  }
  return groups.filter((g) =>
    compCats.some((cc) => ageBandsOverlap(g.ageCategory, cc))
  );
}
