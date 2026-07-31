import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyActiveWithAgeCategory() {
  return prisma.eventGroup.findMany({
    where: { isActive: true },
    include: { ageCategory: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findManyAllWithAgeCategory() {
  return prisma.eventGroup.findMany({
    include: { ageCategory: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function createEventGroup(data: Prisma.EventGroupCreateInput) {
  return prisma.eventGroup.create({
    data,
    include: { ageCategory: true },
  });
}

export function updateEventGroup(id: string, data: Prisma.EventGroupUpdateInput) {
  return prisma.eventGroup.update({
    where: { id },
    data,
    include: { ageCategory: true },
  });
}

export function deleteEventGroup(id: string) {
  return prisma.eventGroup.delete({ where: { id } });
}

export function findById(id: string) {
  return prisma.eventGroup.findUnique({ where: { id } });
}

/** Child event usages that block hard delete of the group (cascade would otherwise fail or wipe data). */
export async function countUsagesBlockingDelete(eventGroupId: string) {
  const eventWhere = { event: { eventGroupId } };
  const [regs, results, standings, participations] = await prisma.$transaction([
    prisma.tournamentRegistration.count({ where: eventWhere }),
    prisma.competitionResult.count({ where: eventWhere }),
    prisma.competitionAggregateStanding.count({ where: eventWhere }),
    prisma.participationRecord.count({ where: eventWhere }),
  ]);
  return regs + results + standings + participations;
}
