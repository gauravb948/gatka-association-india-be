import { prisma } from "../lib/prisma.js";

export type MarkCompetitionAttendanceInput = {
  competitionId: string;
  eventId: string;
  userId: string;
  markedById: string;
  present: boolean;
  notes?: string;
};

/** One row per (competitionId, eventId, userId); repeat marks update the same row. */
export function markOne(input: MarkCompetitionAttendanceInput) {
  const { competitionId, eventId, userId, markedById, present, notes } = input;
  return prisma.competitionAttendance.upsert({
    where: {
      competitionId_eventId_userId: { competitionId, eventId, userId },
    },
    create: {
      competitionId,
      eventId,
      userId,
      markedById,
      present,
      notes: notes ?? undefined,
    },
    update: {
      present,
      markedById,
      notes: notes ?? null,
    },
  });
}

/** All items run in a single database transaction. */
export function markMany(items: MarkCompetitionAttendanceInput[]) {
  if (items.length === 0) return Promise.resolve([]);
  return prisma.$transaction((tx) =>
    Promise.all(
      items.map((item) => {
        const { competitionId, eventId, userId, markedById, present, notes } = item;
        return tx.competitionAttendance.upsert({
          where: {
            competitionId_eventId_userId: { competitionId, eventId, userId },
          },
          create: {
            competitionId,
            eventId,
            userId,
            markedById,
            present,
            notes: notes ?? undefined,
          },
          update: {
            present,
            markedById,
            notes: notes ?? null,
          },
        });
      })
    )
  );
}

export function findByCompetitionEvent(competitionId: string, eventId: string) {
  return prisma.competitionAttendance.findMany({
    where: { competitionId, eventId },
  });
}

/** Event-agnostic: true if the player has any present mark anywhere in this competition. */
export function findAnyPresentForPlayer(competitionId: string, userId: string) {
  return prisma.competitionAttendance.findFirst({
    where: { competitionId, userId, present: true },
    select: { id: true },
  });
}

/** Event-scoped: used to gate certificate generation for that specific event. */
export function findPresentForPlayerEvent(
  competitionId: string,
  eventId: string,
  userId: string
) {
  return prisma.competitionAttendance.findFirst({
    where: { competitionId, eventId, userId, present: true },
    select: { id: true },
  });
}
