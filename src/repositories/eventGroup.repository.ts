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

export function findById(id: string) {
  return prisma.eventGroup.findUnique({ where: { id } });
}
