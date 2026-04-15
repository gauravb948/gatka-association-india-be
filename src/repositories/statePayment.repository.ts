import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findByStateId(stateId: string) {
  return prisma.statePaymentConfig.findUnique({ where: { stateId } });
}

export function upsertForState(
  stateId: string,
  create: Prisma.StatePaymentConfigCreateInput,
  update: Prisma.StatePaymentConfigUpdateInput
) {
  return prisma.statePaymentConfig.upsert({
    where: { stateId },
    create,
    update,
  });
}

export function findManyPaginated(params: { skip: number; take: number; stateId?: string }) {
  const where: Prisma.StatePaymentConfigWhereInput = params.stateId ? { stateId: params.stateId } : {};
  return prisma.$transaction([
    prisma.statePaymentConfig.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: {
        state: { select: { id: true, name: true, code: true, isEnabled: true } },
      },
    }),
    prisma.statePaymentConfig.count({ where }),
  ]);
}
