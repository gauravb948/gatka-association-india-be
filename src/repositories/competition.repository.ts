import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findMany(sessionId?: string) {
  return prisma.competition.findMany({
    where: sessionId ? { sessionId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { ageCategory: true },
  });
}

export function createWithEvents(
  data: Prisma.CompetitionCreateInput,
  include?: Prisma.CompetitionInclude
) {
  return prisma.competition.create({
    data,
    include: include ?? { events: { include: { event: true } } },
  });
}

export function findByIdWithAgeCategory(id: string) {
  return prisma.competition.findUnique({
    where: { id },
    include: { ageCategory: true },
  });
}

export function findByIdWithEvents(id: string) {
  return prisma.competition.findUnique({
    where: { id },
    include: { events: true },
  });
}

export function findByIdBasic(id: string) {
  return prisma.competition.findUnique({ where: { id } });
}
