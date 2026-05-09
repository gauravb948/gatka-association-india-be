import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createPayment(data: Prisma.PaymentCreateInput) {
  return prisma.payment.create({ data });
}

export function updateRazorpayOrderId(id: string, razorpayOrderId: string) {
  return prisma.payment.update({
    where: { id },
    data: { razorpayOrderId },
  });
}

export function findManyByUser(userId: string, take: number) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        select: { id: true, role: true, email: true },
      },
      state: {
        select: { id: true, name: true, code: true },
      },
      session: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
      tournamentRegs: {
        select: { id: true, competitionId: true, playerUserId: true, registeredById: true },
      },
      campRegs: {
        select: { id: true, campId: true, userId: true },
      },
      stateRegistrations: {
        select: { id: true, stateId: true, userId: true },
      },
      districtRegistrations: {
        select: { id: true, districtId: true, stateId: true, userId: true },
      },
      memberships: {
        select: { id: true, userId: true, type: true, status: true },
      },
    },
  });
}

export function markPaidIfPending(id: string, razorpayPaymentId?: string) {
  return prisma.payment.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "PAID",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    },
  });
}

export function findById(id: string) {
  return prisma.payment.findUnique({ where: { id } });
}

export function findFirstByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.payment.findFirst({ where: { razorpayOrderId } });
}
