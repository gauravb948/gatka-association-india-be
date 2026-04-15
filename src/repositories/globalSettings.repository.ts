import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findSingleton() {
  return prisma.globalSettings.findUnique({ where: { id: "singleton" } });
}

export function upsertSingleton(
  create: Prisma.GlobalSettingsCreateInput,
  update: Prisma.GlobalSettingsUpdateInput
) {
  return prisma.globalSettings.upsert({
    where: { id: "singleton" },
    create,
    update,
  });
}
