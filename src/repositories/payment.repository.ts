import type { Prisma } from "@prisma/client";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const manualPaymentInclude = {
  user: {
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      status: true,
      statusReason: true,
      stateId: true,
      districtId: true,
      trainingCenterId: true,
      state: { select: { id: true, name: true, code: true } },
      district: {
        select: {
          id: true,
          name: true,
          stateId: true,
          state: { select: { id: true, name: true } },
        },
      },
      trainingCenter: {
        select: {
          id: true,
          name: true,
          districtId: true,
          district: {
            select: {
              id: true,
              name: true,
              stateId: true,
              state: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  state: {
    select: { id: true, name: true, code: true },
  },
} as const;

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

export function findPendingManualByUser(userId: string) {
  return prisma.payment.findFirst({
    where: {
      userId,
      method: PaymentMethod.MANUAL,
      status: PaymentStatus.PENDING,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findPendingManualForReview() {
  return prisma.payment.findMany({
    where: {
      method: PaymentMethod.MANUAL,
      status: PaymentStatus.PENDING,
      user: { status: "PENDING" },
    },
    orderBy: { createdAt: "asc" },
    include: manualPaymentInclude,
  });
}

export function findManualByIdForReview(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: manualPaymentInclude,
  });
}

export function failOtherPendingManual(userId: string, exceptPaymentId: string) {
  return prisma.payment.updateMany({
    where: {
      userId,
      method: PaymentMethod.MANUAL,
      status: PaymentStatus.PENDING,
      id: { not: exceptPaymentId },
    },
    data: { status: PaymentStatus.FAILED },
  });
}

export function markFailed(id: string, metadata?: Prisma.InputJsonValue) {
  return prisma.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.FAILED,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });
}

/** PENDING payments that have a Razorpay order id (candidates for reconcile). */
export function findPendingWithRazorpayOrder(params: {
  take: number;
  stateId?: string;
  purpose?: Prisma.EnumPaymentPurposeFilter["equals"];
}) {
  return prisma.payment.findMany({
    where: {
      status: "PENDING",
      razorpayOrderId: { not: null },
      ...(params.stateId ? { stateId: params.stateId } : {}),
      ...(params.purpose ? { purpose: params.purpose } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: params.take,
    select: {
      id: true,
      userId: true,
      stateId: true,
      purpose: true,
      amountPaise: true,
      status: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      metadata: true,
      createdAt: true,
    },
  });
}
