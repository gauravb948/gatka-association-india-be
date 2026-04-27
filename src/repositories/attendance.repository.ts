import type { Attendance } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type AttendanceClient = Pick<typeof prisma, "attendance">;

export type MarkAttendanceInput = {
  userId: string;
  type: string;
  date: Date;
  markedById: string;
  present: boolean;
  competitionId?: string;
  campId?: string;
  trainingCenterId?: string;
  notes?: string;
};

/**
 * One row per (userId, calendar date). Repeating the mark for the same day updates
 * type, present, context ids, notes, and markedById.
 */
async function markAttendanceInTx(
  db: AttendanceClient,
  input: MarkAttendanceInput
): Promise<{ row: Attendance; created: boolean }> {
  const {
    userId,
    type,
    date,
    markedById,
    present,
    competitionId,
    campId,
    trainingCenterId,
    notes,
  } = input;

  const existing = await db.attendance.findFirst({
    where: { userId, date },
  });
  if (existing) {
    const row = await db.attendance.update({
      where: { id: existing.id },
      data: {
        type,
        markedBy: { connect: { id: markedById } },
        present,
        competition: competitionId
          ? { connect: { id: competitionId } }
          : { disconnect: true },
        camp: campId ? { connect: { id: campId } } : { disconnect: true },
        trainingCenterId: trainingCenterId ?? null,
        notes: notes ?? null,
      },
    });
    return { row, created: false };
  }
  const row = await db.attendance.create({
    data: {
      type,
      date,
      user: { connect: { id: userId } },
      markedBy: { connect: { id: markedById } },
      present,
      competition: competitionId
        ? { connect: { id: competitionId } }
        : undefined,
      camp: campId ? { connect: { id: campId } } : undefined,
      trainingCenterId: trainingCenterId ?? undefined,
      notes: notes ?? undefined,
    },
  });
  return { row, created: true };
}

export function markAttendance(
  input: MarkAttendanceInput
): Promise<{ row: Attendance; created: boolean }> {
  return prisma.$transaction((tx) => markAttendanceInTx(tx, input));
}

/** All items run in a single database transaction. */
export function markAttendanceMany(
  items: MarkAttendanceInput[]
): Promise<{ row: Attendance; created: boolean }[]> {
  if (items.length === 0) return Promise.resolve([]);
  return prisma.$transaction((tx) =>
    Promise.all(items.map((item) => markAttendanceInTx(tx, item)))
  );
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
