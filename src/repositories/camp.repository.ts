import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyAllOrdered() {
  return prisma.camp.findMany({ orderBy: { startDate: "desc" } });
}

export function findById(id: string) {
  return prisma.camp.findUnique({ where: { id } });
}

export function createCamp(data: Prisma.CampCreateInput) {
  return prisma.camp.create({ data });
}

export function createCampRegistration(data: Prisma.CampRegistrationCreateInput) {
  return prisma.campRegistration.create({ data });
}

export function findRegistrationsByCamp(campId: string) {
  return prisma.campRegistration.findMany({
    where: { campId },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
}

export function updateCampRegistration(
  id: string,
  data: Prisma.CampRegistrationUpdateInput
) {
  return prisma.campRegistration.update({ where: { id }, data });
}
