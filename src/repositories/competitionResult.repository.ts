import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function upsertResult(args: {
  competitionId: string;
  eventId: string;
  playerUserId: string;
  rank: number | null;
  score: string | null;
  certificateQrPayload: string;
}) {
  return prisma.competitionResult.upsert({
    where: {
      competitionId_eventId_playerUserId: {
        competitionId: args.competitionId,
        eventId: args.eventId,
        playerUserId: args.playerUserId,
      },
    },
    create: {
      competitionId: args.competitionId,
      eventId: args.eventId,
      playerUserId: args.playerUserId,
      rank: args.rank,
      score: args.score,
      certificateQrPayload: args.certificateQrPayload,
    },
    update: {
      rank: args.rank,
      score: args.score,
      certificateQrPayload: args.certificateQrPayload,
    },
  });
}

export function findManyForPdfExport(competitionId: string) {
  return prisma.competitionResult.findMany({
    where: { competitionId },
    include: {
      event: true,
      playerUser: { include: { playerProfile: true } },
    },
    orderBy: [{ eventId: "asc" }, { rank: "asc" }],
  });
}

export function findManyForXlsxExport(competitionId: string) {
  return prisma.competitionResult.findMany({
    where: { competitionId },
    include: {
      event: { include: { eventGroup: { include: { ageCategory: true } } } },
      playerUser: { include: { playerProfile: true } },
    },
    orderBy: [{ eventId: "asc" }, { rank: "asc" }],
  });
}

export function findUniqueForVerify(
  competitionId: string,
  eventId: string,
  playerUserId: string
) {
  return prisma.competitionResult.findUnique({
    where: {
      competitionId_eventId_playerUserId: {
        competitionId,
        eventId,
        playerUserId,
      },
    },
    include: {
      competition: { select: { id: true, name: true } },
      event: { select: { id: true, name: true } },
      playerUser: {
        select: {
          id: true,
          email: true,
          playerProfile: {
            select: { fullName: true, registrationNumber: true },
          },
        },
      },
    },
  });
}
