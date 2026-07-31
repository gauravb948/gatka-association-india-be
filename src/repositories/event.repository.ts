import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyByGroup(eventGroupId: string) {
  return prisma.event.findMany({
    where: { eventGroupId },
    orderBy: { sortOrder: "asc" },
  });
}

export function findById(id: string) {
  return prisma.event.findUnique({ where: { id } });
}

export function createEvent(data: Prisma.EventCreateInput) {
  return prisma.event.create({ data });
}

export function updateEvent(id: string, data: Prisma.EventUpdateInput) {
  return prisma.event.update({ where: { id }, data });
}

export function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}

/** Registrations / results / standings / participations that block hard delete. */
export async function countUsagesBlockingDelete(eventId: string) {
  const [regs, results, standings, participations] = await prisma.$transaction([
    prisma.tournamentRegistration.count({ where: { eventId } }),
    prisma.competitionResult.count({ where: { eventId } }),
    prisma.competitionAggregateStanding.count({ where: { eventId } }),
    prisma.participationRecord.count({ where: { eventId } }),
  ]);
  return regs + results + standings + participations;
}
