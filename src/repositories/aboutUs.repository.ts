import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const stateSummarySelect = {
  select: { id: true, name: true, code: true },
} as const;

const aboutUsIncludeState = {
  include: { state: stateSummarySelect },
} as const;

export function findByStateId(stateId: string) {
  return prisma.aboutUs.findUnique({
    where: { stateId },
    ...aboutUsIncludeState,
  });
}

export function findAnotherByStateId(stateId: string, excludeId: string) {
  return prisma.aboutUs.findFirst({
    where: { stateId, NOT: { id: excludeId } },
  });
}

export function findManyForAdmin(where?: Prisma.AboutUsWhereInput) {
  return prisma.aboutUs.findMany({
    ...(where !== undefined ? { where } : {}),
    ...aboutUsIncludeState,
    orderBy: { updatedAt: "desc" },
  });
}

export function findById(id: string) {
  return prisma.aboutUs.findUnique({
    where: { id },
    ...aboutUsIncludeState,
  });
}

export function createAboutUs(data: Prisma.AboutUsCreateInput) {
  return prisma.aboutUs.create({
    data,
    ...aboutUsIncludeState,
  });
}

export function updateAboutUs(id: string, data: Prisma.AboutUsUpdateInput) {
  return prisma.aboutUs.update({
    where: { id },
    data,
    ...aboutUsIncludeState,
  });
}

export function deleteAboutUs(id: string) {
  return prisma.aboutUs.delete({ where: { id } });
}
