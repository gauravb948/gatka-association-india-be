import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createParticipation(data: Prisma.ParticipationRecordCreateInput) {
  return prisma.participationRecord.create({ data });
}

export function findFirstDistrictParticipation(
  playerUserId: string,
  sessionId: string
) {
  return prisma.participationRecord.findFirst({
    where: {
      playerUserId,
      sessionId,
      level: "DISTRICT",
      participated: true,
    },
  });
}

export function findFirstStateParticipation(
  playerUserId: string,
  sessionId: string
) {
  return prisma.participationRecord.findFirst({
    where: {
      playerUserId,
      sessionId,
      level: "STATE",
      participated: true,
    },
  });
}
