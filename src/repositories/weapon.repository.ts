import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findManyActive() {
  return prisma.weapon.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function findManyAll() {
  return prisma.weapon.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function findById(id: string) {
  return prisma.weapon.findUnique({ where: { id } });
}

export function create(data: Prisma.WeaponUncheckedCreateInput) {
  return prisma.weapon.create({ data });
}

export function update(id: string, data: Prisma.WeaponUncheckedUpdateInput) {
  return prisma.weapon.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.weapon.delete({ where: { id } });
}
