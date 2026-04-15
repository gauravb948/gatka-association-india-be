import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createAttendance(data: Prisma.AttendanceCreateInput) {
  return prisma.attendance.create({ data });
}

export function findManyByUser(userId: string, take: number) {
  return prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take,
  });
}

export function findManyTournamentByCompetition(competitionId: string) {
  return prisma.attendance.findMany({
    where: { competitionId, type: "TOURNAMENT" },
    include: { user: { select: { id: true, email: true } } },
  });
}

export function findTournamentPresentForPlayer(
  competitionId: string,
  userId: string
) {
  return prisma.attendance.findMany({
    where: {
      competitionId,
      userId,
      type: "TOURNAMENT",
      present: true,
    },
  });
}
