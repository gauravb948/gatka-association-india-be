import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyPublicActive() {
  return prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export function findManyAll() {
  return prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
}

export function findById(id: string) {
  return prisma.banner.findUnique({ where: { id } });
}

export function createBanner(data: Prisma.BannerCreateInput) {
  return prisma.banner.create({ data });
}

export function updateBanner(id: string, data: Prisma.BannerUpdateInput) {
  return prisma.banner.update({ where: { id }, data });
}

export function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}

