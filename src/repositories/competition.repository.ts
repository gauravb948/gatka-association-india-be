import type { Prisma, Role } from "@prisma/client";
import { ageBandsOverlap } from "../lib/age.js";
import { prisma } from "../lib/prisma.js";

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

export function findMany(filters?: { nameContains?: string }) {
  const where = withNameContains({}, filters?.nameContains);
  return prisma.competition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: defaultCompetitionInclude,
  });
}

/**
 * National — comps you created, by lower admins, or legacy (no creator).
 * State — non-national comps whose selected states include this admin's state, or whose
 * selected districts fall in this state (e.g. national admin chose states A+B → only A/B state admins).
 * District — selected district matches, or state-only scope (no districts) with this admin's state.
 * Training center — `DISTRICT`-level competitions that list this TC's district (`districtId` from user or linked TC).
 * Others — tournament registrations as player.
 */
export async function findManyForAuthenticatedUserPaginated(
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

  const grouped = await prisma.tournamentRegistration.groupBy({
    by: ["competitionId"],
    where: { playerUserId: user.id },
  });
  const idList = grouped.map((g) => g.competitionId);
  if (idList.length === 0) return { items: [], total: 0 };
  const where = withNameContains({ id: { in: idList } }, nameContains);
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
