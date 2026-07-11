import type { CompetitionLevel, Gender, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildResultsListCompetitionFilter } from "./competition.repository.js";
import type { RegistrationStatSource } from "../lib/competitionRegistrationStats.js";

export async function findParticipationsForAgeWiseReport(
  competitionId: string,
  gender: Gender,
  ageCategoryIds: readonly string[],
  playerProfileWhere?: Prisma.PlayerProfileWhereInput
) {
  if (ageCategoryIds.length === 0) return [];

  const profileFilter =
    playerProfileWhere && Object.keys(playerProfileWhere).length > 0
      ? { playerUser: { playerProfile: playerProfileWhere } }
      : {};

  return prisma.participationRecord.findMany({
    where: {
      competitionId,
      participated: true,
      eventId: { not: null },
      event: {
        isActive: true,
        eventGroup: {
          isActive: true,
          gender,
          ageCategoryId: { in: [...ageCategoryIds] },
        },
      },
      ...profileFilter,
    },
    select: {
      playerUserId: true,
      playerUser: {
        select: {
          playerProfile: {
            select: {
              trainingCenter: { select: { name: true } },
              district: { select: { name: true } },
              state: { select: { name: true } },
            },
          },
        },
      },
      event: {
        select: {
          name: true,
          eventGroup: {
            select: {
              ageCategory: {
                select: { id: true, name: true, ageTo: true, sortOrder: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function findParticipationsForEventGroupParticipantsReport(
  competitionId: string,
  eventGroupIds: readonly string[],
  playerProfileWhere?: Prisma.PlayerProfileWhereInput
) {
  if (eventGroupIds.length === 0) return [];

  const profileFilter =
    playerProfileWhere && Object.keys(playerProfileWhere).length > 0
      ? { playerUser: { playerProfile: playerProfileWhere } }
      : {};

  return prisma.participationRecord.findMany({
    where: {
      competitionId,
      participated: true,
      eventId: { not: null },
      event: {
        isActive: true,
        eventGroupId: { in: [...eventGroupIds] },
        eventGroup: { isActive: true },
      },
      ...profileFilter,
    },
    select: {
      playerUserId: true,
      playerUser: {
        select: {
          playerProfile: {
            select: {
              fullName: true,
              fatherName: true,
              motherName: true,
              dateOfBirth: true,
              aadharNumber: true,
            },
          },
        },
      },
      event: {
        select: {
          name: true,
          eventGroup: {
            select: { segment: true, gender: true },
          },
        },
      },
    },
  });
}

/** Distinct registered players per catalog event, scoped by optional player profile filters. */
export async function countDistinctPlayersByEvent(
  competitionId: string,
  eventIds: readonly string[],
  playerProfileWhere?: Prisma.PlayerProfileWhereInput
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();

  const profileFilter =
    playerProfileWhere && Object.keys(playerProfileWhere).length > 0
      ? { playerUser: { playerProfile: playerProfileWhere } }
      : {};

  const grouped = await prisma.participationRecord.groupBy({
    by: ["eventId", "playerUserId"],
    where: {
      competitionId,
      participated: true,
      eventId: { in: [...eventIds] },
      ...profileFilter,
    },
  });

  const counts = new Map<string, number>();
  for (const row of grouped) {
    if (!row.eventId) continue;
    counts.set(row.eventId, (counts.get(row.eventId) ?? 0) + 1);
  }
  return counts;
}

export async function findParticipationsForCompetitionStatsReport(
  user: { role: import("@prisma/client").Role; stateId: string | null; districtId: string | null },
  opts?: { competitionId?: string; search?: string }
): Promise<RegistrationStatSource[]> {
  const competitionWhere = buildResultsListCompetitionFilter(user, opts);
  if (competitionWhere === null) return [];

  const where: Prisma.ParticipationRecordWhereInput = {
    participated: true,
    eventId: { not: null },
    competition: competitionWhere,
    playerUser: { playerProfile: { isNot: null } },
  };

  return prisma.participationRecord.findMany({
    where,
    select: {
      competitionId: true,
      playerUserId: true,
      competition: { select: { id: true, name: true, createdAt: true } },
      event: {
        select: {
          eventGroup: {
            select: {
              ageCategory: { select: { bandType: true } },
            },
          },
        },
      },
      playerUser: {
        select: {
          playerProfile: { select: { gender: true } },
        },
      },
    },
  });
}

export function createParticipation(data: Prisma.ParticipationRecordCreateInput) {
  return prisma.participationRecord.create({ data });
}

export async function createManyParticipationRecords(
  rows: Array<{
    sessionId?: string | null;
    competitionId: string;
    playerUserId: string;
    level: CompetitionLevel;
    participated: boolean;
    eventId: string;
    teamId?: string | null;
  }>
) {
  if (rows.length === 0) return { count: 0 };
  const data = rows.map((r) => {
    const { sessionId, ...rest } = r;
    return sessionId ? { ...rest, sessionId } : { ...rest };
  }) as Prisma.ParticipationRecordCreateManyInput[];
  return prisma.participationRecord.createMany({ data });
}

export function findManyByCompetitionAndPlayers(competitionId: string, playerUserIds: string[]) {
  return prisma.participationRecord.findMany({
    where: {
      competitionId,
      playerUserId: { in: playerUserIds },
      participated: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findParticipatedPlayerIds(competitionId: string) {
  return prisma.participationRecord
    .findMany({
      where: { competitionId, participated: true },
      select: { playerUserId: true },
    })
    .then((rows) => [...new Set(rows.map((r) => r.playerUserId))]);
}

/** Players who already have a `participated` record for this competition and catalog `eventId`. */
export function findPlayerUserIdsParticipatedInEvent(competitionId: string, eventId: string) {
  return prisma.participationRecord
    .findMany({
      where: { competitionId, eventId, participated: true },
      select: { playerUserId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.playerUserId)));
}

/** Distinct `playerUserId` with any `participated` row whose `eventId` is in the list. */
export function findPlayerUserIdsParticipatedInAnyOfEvents(
  competitionId: string,
  eventIds: readonly string[]
) {
  if (eventIds.length === 0) {
    return Promise.resolve(new Set<string>());
  }
  return prisma.participationRecord
    .findMany({
      where: {
        competitionId,
        participated: true,
        eventId: { in: [...eventIds] },
      },
      select: { playerUserId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.playerUserId)));
}

/** @deprecated — kept for legacy callers */
export function findActiveParticipation(competitionId: string, playerUserId: string) {
  return prisma.participationRecord.findFirst({
    where: { competitionId, playerUserId, participated: true },
  });
}

export function findExistingParticipationForEvent(
  competitionId: string,
  playerUserId: string,
  eventId: string
) {
  return prisma.participationRecord.findFirst({
    where: { competitionId, playerUserId, eventId, participated: true },
  });
}

export function findParticipationsWithEventsForPlayer(competitionId: string, playerUserId: string) {
  return prisma.participationRecord.findMany({
    where: { competitionId, playerUserId, participated: true },
    include: {
      event: true,
    },
  });
}

/** Catalog events each player is already registered for in this competition. */
export async function findParticipatingEventsByPlayerUserIds(
  competitionId: string,
  playerUserIds: readonly string[]
): Promise<Map<string, Array<{ eventId: string; eventName: string }>>> {
  const map = new Map<string, Array<{ eventId: string; eventName: string }>>();
  if (playerUserIds.length === 0) return map;

  const rows = await prisma.participationRecord.findMany({
    where: {
      competitionId,
      playerUserId: { in: [...playerUserIds] },
      participated: true,
      eventId: { not: null },
    },
    select: {
      playerUserId: true,
      eventId: true,
      event: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const row of rows) {
    if (!row.eventId || !row.event) continue;
    const list = map.get(row.playerUserId) ?? [];
    if (!list.some((entry) => entry.eventId === row.eventId)) {
      list.push({ eventId: row.eventId, eventName: row.event.name });
    }
    map.set(row.playerUserId, list);
  }

  return map;
}

const participationListInclude = {
  playerUser: {
    select: {
      id: true,
      email: true,
      phone: true,
      playerProfile: {
        select: {
          fullName: true,
          gender: true,
          registrationNumber: true,
          stateId: true,
          districtId: true,
          trainingCenterId: true,
          photoUrl: true,
          aadharFrontUrl: true,
          aadharBackUrl: true,
          state: { select: { id: true, name: true, code: true } },
          district: { select: { id: true, name: true } },
          trainingCenter: { select: { id: true, name: true } },
        },
      },
    },
  },
  event: {
    select: {
      id: true,
      name: true,
      eventGroupId: true,
      minPlayers: true,
      maxPlayers: true,
    },
  },
} satisfies Prisma.ParticipationRecordInclude;

export async function findManyByCompetitionPaginated(
  competitionId: string,
  pagination: { skip: number; take: number },
  opts?: { playerProfileWhere?: Prisma.PlayerProfileWhereInput }
) {
  const where: Prisma.ParticipationRecordWhereInput = {
    competitionId,
    participated: true,
    ...(opts?.playerProfileWhere && Object.keys(opts.playerProfileWhere).length > 0
      ? { playerUser: { playerProfile: opts.playerProfileWhere } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.participationRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: participationListInclude,
    }),
    prisma.participationRecord.count({ where }),
  ]);
  return { items, total };
}

/** Lower-level competition completed in calendar year (UTC) of `year`, with tournament attendance marked present. */
export async function hasCompletedCompetitionAtLevel(
  playerUserId: string,
  year: number,
  level: "DISTRICT" | "STATE"
): Promise<boolean> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await prisma.participationRecord.findMany({
    where: {
      playerUserId,
      participated: true,
      level,
      competition: { createdAt: { gte: start, lt: end } },
    },
    select: { competitionId: true },
    distinct: ["competitionId"],
  });
  for (const r of rows) {
    const att = await prisma.attendance.findFirst({
      where: {
        userId: playerUserId,
        competitionId: r.competitionId,
        type: "TOURNAMENT",
        present: true,
      },
    });
    if (att) return true;
  }
  return false;
}
