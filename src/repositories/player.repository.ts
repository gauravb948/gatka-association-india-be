import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyProfiles(params: {
  where: Prisma.PlayerProfileWhereInput;
  orderBy: Prisma.PlayerProfileOrderByWithRelationInput;
  take?: number;
}) {
  return prisma.playerProfile.findMany({
    where: params.where,
    orderBy: params.orderBy,
    take: params.take ?? 500,
  });
}

export function findProfileWithGeo(userId: string) {
  return prisma.playerProfile.findUnique({
    where: { userId },
    include: { state: true, district: true, trainingCenter: true },
  });
}

export function findProfileByUserId(userId: string) {
  return prisma.playerProfile.findUnique({ where: { userId } });
}

export function findProfileWithDistrict(userId: string) {
  return prisma.playerProfile.findUnique({
    where: { userId },
    include: { district: true },
  });
}

export function findProfileWithState(userId: string) {
  return prisma.playerProfile.findUnique({
    where: { userId },
    include: { state: true },
  });
}

export function findManyEligibleActive() {
  return prisma.playerProfile.findMany({
    where: {
      registrationStatus: "ACTIVE",
      isBlacklisted: false,
      tcDisabled: false,
    },
    include: { user: true },
  });
}

export function updateProfile(userId: string, data: Prisma.PlayerProfileUpdateInput) {
  return prisma.playerProfile.update({ where: { userId }, data });
}

export async function allocateRegistrationNumber(stateCode: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${stateCode.toUpperCase()}-${year}-`;
  const last = await prisma.playerProfile.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });
  let next = 1;
  if (last?.registrationNumber) {
    const part = last.registrationNumber.replace(prefix, "");
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

export function updateManyByUserId(userId: string, data: Prisma.PlayerProfileUpdateInput) {
  return prisma.playerProfile.updateMany({ where: { userId }, data });
}
