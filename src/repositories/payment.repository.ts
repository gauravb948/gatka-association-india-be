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
