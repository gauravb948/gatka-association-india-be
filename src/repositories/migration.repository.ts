import type { MigrationStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createRequest(data: Prisma.MigrationRequestCreateInput) {
  return prisma.migrationRequest.create({ data });
}

export function findById(id: string) {
  return prisma.migrationRequest.findUnique({ where: { id } });
}

export function updateStatus(id: string, status: MigrationStatus) {
  return prisma.migrationRequest.update({
    where: { id },
    data: { status },
  });
}

export async function approveDestinationMoveUser(args: {
  migrationId: string;
  userId: string;
  toStateId: string;
  toDistrictId: string;
  toTcId: string;
}) {
  await prisma.$transaction([
    prisma.migrationRequest.update({
      where: { id: args.migrationId },
      data: { status: "APPROVED" },
    }),
    prisma.playerProfile.update({
      where: { userId: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
    prisma.user.update({
      where: { id: args.userId },
      data: {
        stateId: args.toStateId,
        districtId: args.toDistrictId,
        trainingCenterId: args.toTcId,
      },
    }),
  ]);
}
