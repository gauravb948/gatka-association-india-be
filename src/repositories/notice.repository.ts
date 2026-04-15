import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyRecent(take: number) {
  return prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { author: { select: { id: true, email: true, role: true } } },
  });
}

export function createNotice(data: Prisma.NoticeCreateInput) {
  return prisma.notice.create({ data });
}
