import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyByState(stateId: string) {
  return prisma.galleryImage.findMany({
    where: { stateId },
    orderBy: { createdAt: "desc" },
  });
}

export function findMany() {
  return prisma.galleryImage.findMany({
    orderBy: { createdAt: "desc" },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function findById(id: string) {
  return prisma.galleryImage.findUnique({ where: { id } });
}

export function create(data: Prisma.GalleryImageCreateInput) {
  return prisma.galleryImage.create({ data });
}

export function remove(id: string) {
  return prisma.galleryImage.delete({ where: { id } });
}
