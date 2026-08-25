import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const includeState = {
  include: { state: { select: { id: true, name: true, code: true } } },
} as const;

export function findManyByState(stateId: string) {
  return prisma.associationMember.findMany({
    where: { stateId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function findManyForAdmin(stateId: string) {
  return prisma.associationMember.findMany({
    where: { stateId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...includeState,
  });
}

export function findById(id: string) {
  return prisma.associationMember.findUnique({
    where: { id },
    ...includeState,
  });
}

export function create(data: Prisma.AssociationMemberUncheckedCreateInput) {
  return prisma.associationMember.create({
    data,
    ...includeState,
  });
}

export function update(id: string, data: Prisma.AssociationMemberUncheckedUpdateInput) {
  return prisma.associationMember.update({
    where: { id },
    data,
    ...includeState,
  });
}

export function remove(id: string) {
  return prisma.associationMember.delete({ where: { id } });
}
