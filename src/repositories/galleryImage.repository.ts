import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyByState(stateId: string | null) {
  return prisma.galleryImage.findMany({
    where: { stateId },
    orderBy: { createdAt: "desc" },
  });
}

export function findMany(filter?: { stateId: string | null }) {
  return prisma.galleryImage.findMany({
    where: filter !== undefined ? { stateId: filter.stateId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function findById(id: string) {
  return prisma.galleryImage.findUnique({
    where: { id },
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function create(data: Prisma.GalleryImageUncheckedCreateInput) {
  return prisma.galleryImage.create({
    data,
    include: { state: { select: { id: true, name: true, code: true } } },
  });
}

export function remove(id: string) {
  return prisma.galleryImage.delete({ where: { id } });
}
