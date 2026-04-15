import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createComplaint(data: Prisma.ComplaintCreateInput) {
  return prisma.complaint.create({ data });
}

export function findManyByUser(userId: string) {
  return prisma.complaint.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function updateComplaint(id: string, data: Prisma.ComplaintUpdateInput) {
  return prisma.complaint.update({ where: { id }, data });
}
