import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyActive() {
  return prisma.session.findMany({
    where: { isActive: true },
    orderBy: { startDate: "desc" },
  });
}

export function findManyAll() {
  return prisma.session.findMany({ orderBy: { startDate: "desc" } });
}

export function createSession(data: Prisma.SessionCreateInput) {
  return prisma.session.create({ data });
}

export function updateSession(id: string, data: Prisma.SessionUpdateInput) {
  return prisma.session.update({ where: { id }, data });
}
