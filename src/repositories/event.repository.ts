import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyActiveByGroup(eventGroupId: string) {
  return prisma.event.findMany({
    where: { eventGroupId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function createEvent(data: Prisma.EventCreateInput) {
  return prisma.event.create({ data });
}

export function updateEvent(id: string, data: Prisma.EventUpdateInput) {
  return prisma.event.update({ where: { id }, data });
}
