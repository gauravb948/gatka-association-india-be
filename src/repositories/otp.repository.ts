import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createOtp(data: Prisma.OtpCodeCreateInput) {
  return prisma.otpCode.create({ data });
}

export function findLatestValidPasswordReset(
  userId: string,
  phoneOrEmail: string
) {
  return prisma.otpCode.findFirst({
    where: {
      phoneOrEmail,
      userId,
      purpose: "PASSWORD_RESET",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function markConsumed(id: string) {
  return prisma.otpCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}
