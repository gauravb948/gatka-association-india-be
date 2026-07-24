import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyByState(stateId: string | null) {
  return prisma.message.findMany({
    where: { stateId },
    orderBy: { createdAt: "desc" },
  });
}

export function findMany(filter?: { stateId: string | null }) {
  return prisma.message.findMany({
    where: filter !== undefined ? { stateId: filter.stateId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function findById(id: string) {
  return prisma.message.findUnique({
    where: { id },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function create(data: Prisma.MessageUncheckedCreateInput) {
  return prisma.message.create({
    data,
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function update(id: string, data: Prisma.MessageUncheckedUpdateInput) {
  return prisma.message.update({
    where: { id },
    data,
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function remove(id: string) {
  return prisma.message.delete({ where: { id } });
}
