import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyPublicActive() {
  return prisma.nationalNotice.findMany({
    where: { display: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function findManyForAdmin() {
  return prisma.nationalNotice.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function findById(id: string) {
  return prisma.nationalNotice.findUnique({ where: { id } });
}

export function create(data: Prisma.NationalNoticeUncheckedCreateInput) {
  return prisma.nationalNotice.create({ data });
}

export function update(id: string, data: Prisma.NationalNoticeUncheckedUpdateInput) {
  return prisma.nationalNotice.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.nationalNotice.delete({ where: { id } });
}
