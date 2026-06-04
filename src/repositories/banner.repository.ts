import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const stateSummarySelect = {
  select: { id: true, name: true, code: true },
} as const;

const bannerIncludeState = {
  include: { state: stateSummarySelect },
} as const;

export function findManyPublicActive(stateId: string) {
  return prisma.banner.findMany({
    where: { isActive: true, stateId },
    ...bannerIncludeState,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export function findManyForAdmin(where?: Prisma.BannerWhereInput) {
  return prisma.banner.findMany({
    ...(where !== undefined ? { where } : {}),
    ...bannerIncludeState,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export function findById(id: string) {
  return prisma.banner.findUnique({
    where: { id },
    ...bannerIncludeState,
  });
}

export function createBanner(data: Prisma.BannerCreateInput) {
  return prisma.banner.create({
    data,
    ...bannerIncludeState,
  });
}

export function updateBanner(id: string, data: Prisma.BannerUpdateInput) {
  return prisma.banner.update({
    where: { id },
    data,
    ...bannerIncludeState,
  });
}

export function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}
