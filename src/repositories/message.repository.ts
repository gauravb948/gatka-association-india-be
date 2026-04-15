import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyByState(stateId: string) {
  return prisma.message.findMany({
    where: { stateId },
    orderBy: { createdAt: "desc" },
  });
}

export function findMany() {
  return prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function findById(id: string) {
  return prisma.message.findUnique({ where: { id } });
}

export function create(data: Prisma.MessageCreateInput) {
  return prisma.message.create({ data });
}

export function update(id: string, data: Prisma.MessageUpdateInput) {
  return prisma.message.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.message.delete({ where: { id } });
}
