import type { MigrationStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createRequest(data: Prisma.MigrationRequestCreateInput) {
  return prisma.migrationRequest.create({ data });
}

export function findById(id: string) {
  return prisma.migrationRequest.findUnique({ where: { id } });
}

export function updateStatus(id: string, status: MigrationStatus) {
  return prisma.migrationRequest.update({
    where: { id },
    data: { status },
  });
}

export async function approveDestinationMoveUser(args: {
  migrationId: string;
  userId: string;
  toStateId: string;
  toDistrictId: string;
  toTcId: string;
}) {
  await prisma.$transaction([
    prisma.migrationRequest.update({
      where: { id: args.migrationId },
      data: { status: "APPROVED" },
    }),
    prisma.playerProfile.update({
      where: { userId: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
    prisma.user.update({
      where: { id: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
  ]);
}

export type PlayerMigrationProfile = {
  userId: string;
  fullName: string;
  stateId: string;
  districtId: string;
  trainingCenterId: string;
};

export function findProfilesForAdminMigrate(userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve([] as PlayerMigrationProfile[]);
  return prisma.playerProfile.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      fullName: true,
      stateId: true,
      districtId: true,
      trainingCenterId: true,
    },
  });
}

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type BlockingCompetition = { id: string; name: string };

/** Competitions that have not ended, keyed by player user id. */
export async function findBlockingCompetitionsByPlayerUserId(
  playerUserIds: string[]
): Promise<Map<string, BlockingCompetition[]>> {
  const result = new Map<string, BlockingCompetition[]>();
  if (playerUserIds.length === 0) return result;

  const upcomingOrOngoing: Prisma.CompetitionWhereInput = {
    OR: [{ endDate: null }, { endDate: { gte: startOfTodayUtc() } }],
  };

  const [participations, tournamentRegs] = await Promise.all([
    prisma.participationRecord.findMany({
      where: {
        playerUserId: { in: playerUserIds },
        competition: upcomingOrOngoing,
      },
      select: {
        playerUserId: true,
        competition: { select: { id: true, name: true } },
      },
    }),
    prisma.tournamentRegistration.findMany({
      where: {
        playerUserId: { in: playerUserIds },
        competition: upcomingOrOngoing,
      },
      select: {
        playerUserId: true,
        competition: { select: { id: true, name: true } },
      },
    }),
  ]);

  const byUser = new Map<string, Map<string, string>>();
  for (const row of [...participations, ...tournamentRegs]) {
    let inner = byUser.get(row.playerUserId);
    if (!inner) {
      inner = new Map();
      byUser.set(row.playerUserId, inner);
    }
    inner.set(row.competition.id, row.competition.name);
  }

  for (const [userId, comps] of byUser) {
    result.set(
      userId,
      [...comps.entries()].map(([id, name]) => ({ id, name }))
    );
  }
  return result;
}

export async function adminMovePlayer(args: {
  userId: string;
  fromStateId: string;
  fromDistrictId: string;
  fromTcId: string;
  toStateId: string;
  toDistrictId: string;
  toTcId: string;
  remarks?: string;
}) {
  await prisma.$transaction([
    prisma.playerProfile.update({
      where: { userId: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
    prisma.user.update({
      where: { id: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
    prisma.migrationRequest.create({
      data: {
        user: { connect: { id: args.userId } },
        fromState: { connect: { id: args.fromStateId } },
        fromDistrictId: args.fromDistrictId,
        fromTcId: args.fromTcId,
        toState: { connect: { id: args.toStateId } },
        toDistrictId: args.toDistrictId,
        toTcId: args.toTcId,
        status: "APPROVED",
        remarks: args.remarks,
      },
    }),
  ]);
}
