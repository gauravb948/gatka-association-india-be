import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyActiveOrdered() {
  return prisma.ageCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findManyAllOrdered() {
  return prisma.ageCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export function findManyAllOrderedPaginated(params: { skip: number; take: number }) {
  return prisma.$transaction([
    prisma.ageCategory.findMany({
      orderBy: { sortOrder: "asc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.ageCategory.count(),
  ]);
}

export function createAgeCategory(data: Prisma.AgeCategoryCreateInput) {
  return prisma.ageCategory.create({ data });
}

export function updateAgeCategory(id: string, data: Prisma.AgeCategoryUpdateInput) {
  return prisma.ageCategory.update({ where: { id }, data });
}

export function deleteAgeCategory(id: string) {
  return prisma.ageCategory.delete({ where: { id } });
}

export function countEventGroupsByAgeCategory(ageCategoryId: string) {
  return prisma.eventGroup.count({ where: { ageCategoryId } });
}
