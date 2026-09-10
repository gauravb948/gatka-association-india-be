import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const authorSelect = {
  author: { select: { id: true, email: true, role: true } },
} satisfies Prisma.NoticeInclude;

export function createNotice(data: Prisma.NoticeCreateInput) {
  return prisma.notice.create({ data, include: authorSelect });
}

/** Notices whose `targetRoles` include the given role, newest first, paginated. */
export async function findInboxPaginated(role: Role, skip: number, take: number) {
  const where: Prisma.NoticeWhereInput = { targetRoles: { has: role } };
  const [items, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: authorSelect,
    }),
    prisma.notice.count({ where }),
  ]);
  return { items, total };
}

/** Notices authored by the given user, newest first, paginated. */
export async function findMinePaginated(authorId: string, skip: number, take: number) {
  const where: Prisma.NoticeWhereInput = { authorId };
  const [items, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: authorSelect,
    }),
    prisma.notice.count({ where }),
  ]);
  return { items, total };
}

export function findById(id: string) {
  return prisma.notice.findUnique({ where: { id } });
}

export function deleteById(id: string) {
  return prisma.notice.delete({ where: { id } });
}
