import type { CompetitionLevel, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

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

const participationListInclude = {
  playerUser: {
    select: {
      id: true,
      email: true,
      username: true,
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
