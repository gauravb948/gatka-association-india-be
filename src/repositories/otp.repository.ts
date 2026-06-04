import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { OtpPurpose } from "../lib/otp.js";

export function createOtp(data: Prisma.OtpCodeCreateInput) {
  return prisma.otpCode.create({ data });
}

export function findLatestValidByPurpose(params: {
  phoneOrEmail: string;
  purpose: OtpPurpose;
  userId?: string | null;
}) {
  const baseWhere: Prisma.OtpCodeWhereInput = {
    phoneOrEmail: params.phoneOrEmail,
    purpose: params.purpose,
    consumedAt: null,
    expiresAt: { gt: new Date() },
  };
  const where =
    params.userId === undefined
      ? baseWhere
      : { ...baseWhere, userId: params.userId };
  return prisma.otpCode.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export function markConsumed(id: string) {
  return prisma.otpCode.updateMany({
    where: { id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}
