import { prisma } from "../lib/prisma.js";

export function findSingleton() {
  return prisma.nationalPaymentConfig.findUnique({ where: { id: "singleton" } });
}

