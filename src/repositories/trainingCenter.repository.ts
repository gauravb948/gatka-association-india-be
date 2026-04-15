import type { Prisma } from "@prisma/client";
import { EntityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyPublicByDistrict(districtId: string) {
  return prisma.trainingCenter.findMany({
    where: { districtId, isEnabled: true, status: EntityStatus.ACCEPTED },
    orderBy: { name: "asc" },
    select: { id: true, name: true, districtId: true },
  });
}

export function findManyByDistrict(districtId: string) {
  return prisma.trainingCenter.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
  });
}

export function findById(id: string) {
  return prisma.trainingCenter.findUnique({ where: { id } });
}

export function findByIdWithDistrict(id: string) {
  return prisma.trainingCenter.findUnique({
    where: { id },
    include: { district: { include: { state: true } } },
  });
}

export function findByIdWithDistrictAndState(id: string) {
  return prisma.trainingCenter.findUnique({
    where: { id },
    include: { district: { include: { state: true } } },
  });
}

export function createTrainingCenter(data: Prisma.TrainingCenterCreateInput) {
  return prisma.trainingCenter.create({ data });
}

export function updateTrainingCenter(id: string, data: Prisma.TrainingCenterUpdateInput) {
  return prisma.trainingCenter.update({ where: { id }, data });
}
